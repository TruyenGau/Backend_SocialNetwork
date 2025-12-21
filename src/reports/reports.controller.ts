import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import {
  ResponseMessage,
  SkipCheckPermission,
  User,
} from 'src/auth/decorator/customize';
import { IUser } from 'src/users/users.interface';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // =========================
  // USER: GỬI REPORT
  // =========================
  @Post()
  @SkipCheckPermission()
  @ResponseMessage('Send report successfully')
  create(@Body() dto: CreateReportDto, @User() user: IUser) {
    return this.reportsService.create(dto, user);
  }

  // =========================
  // ADMIN: XEM DANH SÁCH REPORT
  // =========================
  @SkipCheckPermission()
  @Get()
  @ResponseMessage('Fetch reports list')
  findAll(@Query('status') status?: string) {
    return this.reportsService.findAll(status);
  }

  // =========================
  // ADMIN: XỬ LÝ REPORT
  // =========================
  @SkipCheckPermission()
  @Patch(':id/resolve')
  @ResponseMessage('Resolve report')
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @User() admin: IUser,
  ) {
    return this.reportsService.resolve(id, dto, admin);
  }
  @SkipCheckPermission()
  @Get('stats/top-reasons')
  getTopReasons() {
    return this.reportsService.getTopReportReasons();
  }

  @SkipCheckPermission()
  @Get('stats/by-month')
  getReportByMonth() {
    return this.reportsService.getReportByMonth();
  }
}
