import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/** Valide l'access token (Authorization: Bearer) et construit req.user */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role as AuthenticatedUser['role'],
    };
  }
}
