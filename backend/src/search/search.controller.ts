import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /** GET /search?q=… — recherche globale boutiques + produits (annuaire) */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get()
  @ApiOperation({ summary: 'Recherche globale : boutiques + produits' })
  @ApiQuery({ name: 'q', required: true, description: 'Terme recherché' })
  search(@Query('q') q?: string) {
    return this.searchService.search(q ?? '');
  }
}
