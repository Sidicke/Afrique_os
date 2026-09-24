import { Controller, Post, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  // -- Client --
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  @Post()
  async createRequest(@Request() req: any, @Body() body: any) {
    return this.refundsService.createRequest(
      req.user.id,
      body.orderId,
      body.reason,
      body.description,
      body.evidenceUrl
    );
  }

  // -- Vendor --
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEUR')
  @Get('vendor')
  async getVendorRequests(@Request() req: any) {
    return this.refundsService.getVendorRequests(req.user.boutiqueId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEUR')
  @Get('vendor/:id')
  async getVendorRequestById(@Request() req: any, @Param('id') id: string) {
    return this.refundsService.getVendorRequestById(req.user.boutiqueId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEUR')
  @Patch('vendor/:id/reply')
  async vendorReply(@Request() req: any, @Param('id') id: string, @Body('comment') comment: string) {
    return this.refundsService.vendorReply(req.user.boutiqueId, id, comment);
  }

  // -- Admin --
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin')
  async getAdminRequests() {
    return this.refundsService.getAdminRequests();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/:id')
  async getAdminRequestById(@Param('id') id: string) {
    return this.refundsService.getAdminRequestById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/:id/decide')
  async adminDecide(@Param('id') id: string, @Body() body: { action: 'APPROVE'|'REJECT', resolutionText: string }) {
    return this.refundsService.adminDecide(id, body.action, body.resolutionText);
  }
}
