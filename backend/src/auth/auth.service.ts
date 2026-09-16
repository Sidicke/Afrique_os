import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BoutiqueStatus, Prisma, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'node:crypto';
import type { StringValue } from 'ms';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { FacebookAuthDto } from './dto/facebook-auth.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
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
    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Votre compte a été bloqué par la plateforme');
    }
    if (!user.password) {
      throw new UnauthorizedException(
        `Ce compte a été créé via ${user.authProvider ?? 'Google/Facebook'}. Veuillez utiliser le bouton de connexion correspondant.`,
      );
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
    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Votre compte a été bloqué par la plateforme');
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
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Le nouveau mot de passe doit comporter au moins 8 caractères');
    }
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
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword) {
      throw new BadRequestException('Le mot de passe actuel est requis');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Le nouveau mot de passe doit comporter au moins 8 caractères');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    if (!user.password) {
      throw new BadRequestException(
        `Ce compte est authentifié via ${user.authProvider ?? 'Google/Facebook'}. Vous n'avez pas de mot de passe à modifier.`,
      );
    }
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      throw new BadRequestException('Mot de passe actuel incorrect');
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

  // ===== Authentification Sociale (Google & Facebook OAuth) =====

  /**
   * Authentification / Inscription via Google OAuth (ID Token)
   */
  async googleAuth(dto: GoogleAuthDto): Promise<AuthResponse> {
    let payload: {
      sub: string;
      email: string;
      aud?: string;
      iss?: string;
      name?: string;
      picture?: string;
      email_verified?: string | boolean;
    };

    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(dto.idToken)}`,
      );
      if (!response.ok) {
        throw new Error('Token Google rejeté');
      }
      payload = await response.json();

      // Vérification de l'audience : le token DOIT être destiné à NOTRE application.
      // Sans GOOGLE_CLIENT_ID configuré, on bloque l'auth Google pour éviter
      // qu'un token d'une autre app soit accepté (token substitution attack).
      const expectedClientId = this.config.get<string>('GOOGLE_CLIENT_ID');
      if (!expectedClientId) {
        throw new Error(
          'GOOGLE_CLIENT_ID non configuré — authentification Google désactivée (CWE-284)',
        );
      }
      if (payload.aud !== expectedClientId) {
        throw new Error('Audience du token Google invalide');
      }

      // Vérification de l'issuer : le token DOIT provenir de Google
      const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
      if (payload.iss && !validIssuers.includes(payload.iss)) {
        throw new Error('Issuer du token Google invalide');
      }

      // Vérification que l'email est confirmé par Google
      if (payload.email_verified === false || payload.email_verified === 'false') {
        throw new Error('Adresse e-mail Google non vérifiée');
      }
    } catch {
      throw new UnauthorizedException("Token d'authentification Google invalide ou expiré");
    }

    if (!payload.email) {
      throw new BadRequestException('Aucun e-mail associé à ce compte Google');
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;

    // 1. Recherche par googleId ou par email
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (user) {
      if (user.status === UserStatus.BLOCKED) {
        throw new UnauthorizedException('Votre compte a été bloqué par la plateforme');
      }
      // Liaison du compte Google et mise à jour avatar si nécessaire
      if (!user.googleId || !user.avatarUrl) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: user.googleId ?? googleId,
            avatarUrl: user.avatarUrl ?? payload.picture ?? null,
            name: user.name ?? payload.name ?? null,
          },
        });
      }
      return this.buildAuthResponse(user);
    }

    // Si la requête provient de la page de connexion et qu'aucun compte n'existe
    if (dto.mode === 'login') {
      throw new NotFoundException(
        "Aucun compte n'est associé à cette adresse Google. Veuillez d'abord créer votre compte via la page d'inscription.",
      );
    }

    // 2. Création de compte si nouvel utilisateur (mode inscription)
    const role = dto.role === 'VENDEUR' ? Role.VENDEUR : Role.CLIENT;
    const referralCode = await this.generateUniqueReferralCode();
    let referredById: string | null = null;

    if (dto.referralCode?.trim()) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: dto.referralCode.trim() },
        select: { id: true },
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          googleId,
          authProvider: 'GOOGLE',
          name: payload.name ?? 'Utilisateur Google',
          avatarUrl: payload.picture ?? null,
          phone: dto.phone?.trim() ?? null,
          role,
          referralCode,
          referredById,
        },
      });

      if (role === Role.VENDEUR && dto.shopName?.trim()) {
        const slugBase = this.slugify(dto.shopName);
        await tx.boutique.create({
          data: {
            name: dto.shopName.trim(),
            slug: await this.uniqueSlug(tx, slugBase),
            email,
            ownerId: newUser.id,
            status: BoutiqueStatus.PENDING,
          },
        });
      }

      return newUser;
    });

    return this.buildAuthResponse(created);
  }

  /**
   * Authentification / Inscription via Facebook OAuth (Access Token)
   */
  async facebookAuth(dto: FacebookAuthDto): Promise<AuthResponse> {
    let payload: {
      id: string;
      name?: string;
      email?: string;
      picture?: { data?: { url?: string } };
    };

    try {
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(dto.accessToken)}`,
      );
      if (!response.ok) {
        throw new Error('Token Facebook rejeté');
      }
      payload = await response.json();
    } catch {
      throw new UnauthorizedException("Token d'authentification Facebook invalide ou expiré");
    }

    if (!payload.id) {
      throw new BadRequestException("Impossible de récupérer l'identifiant Facebook");
    }

    const facebookId = payload.id;
    const email = (payload.email ?? `fb_${facebookId}@facebook.zennshop.com`).toLowerCase().trim();
    const avatarUrl = payload.picture?.data?.url ?? null;

    // 1. Recherche par facebookId ou par email
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ facebookId }, { email }],
      },
    });

    if (user) {
      if (user.status === UserStatus.BLOCKED) {
        throw new UnauthorizedException('Votre compte a été bloqué par la plateforme');
      }
      // Liaison du compte Facebook et mise à jour avatar si nécessaire
      if (!user.facebookId || !user.avatarUrl) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            facebookId: user.facebookId ?? facebookId,
            avatarUrl: user.avatarUrl ?? avatarUrl,
            name: user.name ?? payload.name ?? null,
          },
        });
      }
      return this.buildAuthResponse(user);
    }

    // Si la requête provient de la page de connexion et qu'aucun compte n'existe
    if (dto.mode === 'login') {
      throw new NotFoundException(
        "Aucun compte n'est associé à ce compte Facebook. Veuillez d'abord créer votre compte via la page d'inscription.",
      );
    }

    // 2. Création de compte si nouvel utilisateur (mode inscription)
    const role = dto.role === 'VENDEUR' ? Role.VENDEUR : Role.CLIENT;
    const referralCode = await this.generateUniqueReferralCode();
    let referredById: string | null = null;

    if (dto.referralCode?.trim()) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: dto.referralCode.trim() },
        select: { id: true },
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          facebookId,
          authProvider: 'FACEBOOK',
          name: payload.name ?? 'Utilisateur Facebook',
          avatarUrl,
          phone: dto.phone?.trim() ?? null,
          role,
          referralCode,
          referredById,
        },
      });

      if (role === Role.VENDEUR && dto.shopName?.trim()) {
        const slugBase = this.slugify(dto.shopName);
        await tx.boutique.create({
          data: {
            name: dto.shopName.trim(),
            slug: await this.uniqueSlug(tx, slugBase),
            email,
            ownerId: newUser.id,
            status: BoutiqueStatus.PENDING,
          },
        });
      }

      return newUser;
    });

    return this.buildAuthResponse(created);
  }

  private async generateUniqueReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    while (true) {
      let code = 'REF-';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(randomInt(0, chars.length));
      }
      const existing = await this.prisma.user.findUnique({ where: { referralCode: code } });
      if (!existing) return code;
    }
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
      const existingPhone = await this.prisma.user.findFirst({
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
      const existingPhone = await this.prisma.user.findFirst({
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
      return this.prisma.user.findFirst({ where: { phone } });
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
