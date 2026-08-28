import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BoutiqueStatus, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'node:crypto';
import type { StringValue } from 'ms';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendRegistrationCodeDto } from './dto/send-registration-code.dto';

/** Durée de validité d'un code OTP (10 minutes) */
export const OTP_TTL_MS = 10 * 60 * 1000;
/** Tentatives de saisie autorisées avant invalidation du code */
export const OTP_MAX_ATTEMPTS = 5;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserView {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl?: string | null;
  role: Role;
  boutiqueId: string | null;
  boutiqueSlug: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserView;
}

/** Compte créé à l'inscription (le vendeur possède une boutique PENDING) */
export interface SellerAccount {
  user: AuthUserView;
  boutique: {
    id: string;
    name: string;
    slug: string;
    status: BoutiqueStatus;
  } | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  /**
   * Inscription :
   *  - VENDEUR (défaut) : crée le compte + une boutique en PENDING (cycle de
   *    vie : en attente de validation admin)
   *  - CLIENT : simple acheteur (compte nécessaire pour la messagerie)
   */
  async register(dto: RegisterDto): Promise<SellerAccount> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const role = dto.role === 'CLIENT' ? Role.CLIENT : Role.VENDEUR;

    const { user, boutique } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: dto.name,
          phone: dto.phone,
          role,
        },
      });

      // Un vendeur démarre avec sa boutique en PENDING
      if (role !== Role.VENDEUR || !dto.shopName) {
        return { user: createdUser, boutique: null };
      }

      const slugBase = this.slugify(dto.shopName);
      const createdBoutique = await tx.boutique.create({
        data: {
          name: dto.shopName,
          slug: await this.uniqueSlug(tx, slugBase),
          email,
          ownerId: createdUser.id,
          status: BoutiqueStatus.PENDING,
        },
      });
      return { user: createdUser, boutique: createdBoutique };
    });

    return {
      user: this.toUserView(user, boutique?.id ?? null, boutique?.slug ?? null),
      boutique: boutique
        ? {
            id: boutique.id,
            name: boutique.name,
            slug: boutique.slug,
            status: boutique.status,
          }
        : null,
    };
  }

  /** Connexion : vérifie les identifiants, génère le couple de tokens */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.findLoginUser(dto);
    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects');
    }
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }
    return this.buildAuthResponse(user);
  }

  /**
   * Refresh : valide le refresh token (rotation), révoque l'ancien,
   * émet un nouveau couple de tokens.
   */
  async refresh(rawRefreshToken: string): Promise<AuthResponse> {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(
        rawRefreshToken,
        {
          secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
        },
      );
    } catch {
      throw new UnauthorizedException('Session expirée, reconnectez-vous');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Session invalide');
    }
    if (user.refreshTokenHash !== this.hashToken(rawRefreshToken)) {
      // Réutilisation d'un ancien refresh token → session compromise
      throw new UnauthorizedException('Session invalide');
    }

    return this.buildAuthResponse(user);
  }

  /** Demande de réinitialisation de mot de passe (envoi OTP) */
  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      // Pour des raisons de sécurité, ne pas indiquer que l'email n'existe pas.
      return { success: true };
    }
    await this.issueOtp(normalizedEmail, 'RESET_PASSWORD');
    return { success: true };
  }

  /** Réinitialisation du mot de passe avec code OTP */
  async resetPassword(email: string, code: string, newPassword: string) {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Vérifier l'OTP
    const otp = await this.prisma.otpCode.findFirst({
      where: { identifier: normalizedEmail, purpose: 'RESET_PASSWORD', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    
    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException('Code expiré ou invalide');
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Trop de tentatives, demandez un nouveau code');
    }
    if (otp.codeHash !== this.sha256(code)) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Code incorrect');
    }

    // Marquer l'OTP comme consommé
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { email: normalizedEmail },
      data: { password: hashed, refreshTokenHash: null }, // Révocation des sessions
    });

    return { success: true };
  }

  /** Changement de mot de passe par l'utilisateur connecté */
  async changePassword(userId: string, currentPassword?: string, newPassword?: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Le nouveau mot de passe doit comporter au moins 6 caractères');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    if (currentPassword) {
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        throw new BadRequestException('Mot de passe actuel incorrect');
      }
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, refreshTokenHash: null },
    });
    return { success: true };
  }

  /** Déconnexion : révoque le refresh token courant */
  async logout(userId: string): Promise<{ success: boolean }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { success: true };
  }

  // ===== Inscription en 2 temps avec code de vérification (OTP) =====

  /**
   * Étape 2 → 3 : vérifie la disponibilité de l'e-mail (et du téléphone)
   * puis envoie un code à 6 chiffres par e-mail. Le compte n'est PAS créé
   * ici — il ne le sera qu'après validation du code.
   */
  async sendRegistrationCode(
    dto: SendRegistrationCodeDto,
  ): Promise<{ sent: true; expiresInMinutes: number }> {
    const email = dto.email.toLowerCase().trim();

    const existingEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ConflictException('Un compte existe déjà avec cet e-mail');
    }
    if (dto.phone?.trim()) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone.trim() },
      });
      if (existingPhone) {
        throw new ConflictException(
          'Un compte existe déjà avec ce numéro de téléphone',
        );
      }
    }

    await this.issueOtp(email, 'REGISTER');
    return { sent: true, expiresInMinutes: OTP_TTL_MS / 60_000 };
  }

  /**
   * Étape finale : vérifie le code reçu par e-mail puis crée le compte.
   * Le code consommé est invalidé ; l'e-mail est donc prouvé vérifié.
   */
  async completeRegistration(dto: CompleteRegistrationDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();

    const otp = await this.prisma.otpCode.findFirst({
      where: { identifier: email, purpose: 'REGISTER', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException(
        'Code expiré ou introuvable — demandez un nouveau code',
      );
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Trop de tentatives — demandez un nouveau code',
      );
    }
    if (otp.codeHash !== this.sha256(dto.code.trim())) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Code incorrect');
    }

    // Re-vérification des unicités (anti course critique entre envoi et validation)
    const existingEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ConflictException('Un compte existe déjà avec cet e-mail');
    }
    if (dto.phone?.trim()) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone.trim() },
      });
      if (existingPhone) {
        throw new ConflictException(
          'Un compte existe déjà avec ce numéro de téléphone',
        );
      }
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const role = dto.role === 'VENDEUR' ? Role.VENDEUR : Role.CLIENT;
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: dto.name.trim(),
        phone: dto.phone?.trim(),
        role,
      },
    });

    return this.buildAuthResponse(user);
  }

  // ===== Helpers =====

  /** Résout l'utilisateur à partir de l'e-mail OU du téléphone fourni */
  private async findLoginUser(dto: LoginDto) {
    const raw = dto.identifier?.trim();
    const email = (dto.email ?? (raw?.includes('@') ? raw : undefined))
      ?.toLowerCase()
      .trim();
    const phone = dto.phone?.trim() ?? (raw && !raw.includes('@') ? raw : undefined);

    if (email) {
      return this.prisma.user.findUnique({ where: { email } });
    }
    if (phone) {
      return this.prisma.user.findUnique({ where: { phone } });
    }
    return null;
  }

  /** Génère un nouveau code OTP (hashé en base) et l'envoie par e-mail */
  private async issueOtp(identifier: string, purpose: string): Promise<void> {
    // Invalide les codes précédents encore valides pour ce destinataire
    await this.prisma.otpCode.updateMany({
      where: { identifier, purpose, consumedAt: null },
      data: { expiresAt: new Date(0) },
    });

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.otpCode.create({
      data: {
        identifier,
        purpose,
        codeHash: this.sha256(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await this.mail.sendOtpEmail(identifier, code);
  }

  private async buildAuthResponse(user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role: Role;
  }): Promise<AuthResponse> {
    const tokens = await this.signTokens(user.id, user.email, user.role);
    // Rotation : stocke le hash du nouveau refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: this.hashToken(tokens.refreshToken) },
    });

    const boutique = await this.prisma.boutique.findFirst({
      where: { ownerId: user.id },
      select: { id: true, slug: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toUserView(user, boutique?.id ?? null, boutique?.slug ?? null),
    };
  }

  private async signTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<AuthTokens> {
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret';
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret';
    const accessExpiresIn = (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as StringValue;
    const refreshExpiresIn = (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as StringValue;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ email, role }, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
        subject: userId,
      }),
      this.jwtService.signAsync({}, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
        subject: userId,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return this.sha256(token);
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private toUserView(
    user: {
      id: string;
      email: string;
      name: string | null;
      phone: string | null;
      avatarUrl?: string | null;
      role: Role;
    },
    boutiqueId: string | null,
    boutiqueSlug: string | null,
  ): AuthUserView {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      boutiqueId,
      boutiqueSlug,
    };
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'boutique';
  }

  private async uniqueSlug(
    tx: Prisma.TransactionClient,
    base: string,
  ): Promise<string> {
    let slug = base;
    let n = 1;
    while (true) {
      const existing = await tx.boutique.findFirst({ where: { slug } });
      if (!existing) return slug;
      n += 1;
      slug = `${base}-${n}`;
    }
  }
}
