import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, MaxLength } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { NewsletterService } from './newsletter.service';

class SubscribeDto {
  @IsEmail()
  @MaxLength(160)
  email: string;
}

@ApiTags('newsletter')
@Public()
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe/:slug')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Inscription à la newsletter d’une boutique' })
  subscribe(@Param('slug') slug: string, @Body() dto: SubscribeDto) {
    return this.newsletterService.subscribe(slug, dto.email);
  }

  @Post('unsubscribe/:slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Désinscription de la newsletter' })
  unsubscribe(@Param('slug') slug: string, @Body() dto: SubscribeDto) {
    return this.newsletterService.unsubscribe(slug, dto.email);
  }
}
