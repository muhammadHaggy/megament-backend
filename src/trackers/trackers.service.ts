import { Injectable } from '@nestjs/common';
import { CreateTrackerDto } from './dto/create-tracker.dto';
import { UpdateTrackerDto } from './dto/update-tracker.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PageOptionsDto } from 'src/common/interfaces/pagination/page-options.dto';
import { PageDto } from 'src/common/interfaces/pagination/page.dto';

@Injectable()
export class TrackersService {
  constructor(private prismaService: PrismaService) {}
  create(createTrackerDto: CreateTrackerDto) {
    return this.prismaService.tracker.create({
      data: createTrackerDto,
    });
  }

  findAll() {
    return this.prismaService.tracker.findMany();
  }

  findOne(id: number) {
    return this.prismaService.tracker.findUnique({
      where: { id },
    });
  }

  update(id: number, updateTrackerDto: UpdateTrackerDto) {
    return this.prismaService.tracker.update({
      where: { id },
      data: updateTrackerDto,
    });
  }

  remove(id: number) {
    return this.prismaService.tracker.delete({
      where: { id },
    });
  }

  getCurrentLocations() {
    return this.getCurrentLocationsQuery();
  }

  private async getCurrentLocationsQuery() {
    const currentLocations = await this.prismaService.location.groupBy({
      by: ['trackerId'],
      _count: {
        id: true,
      },
      _max: {
        timestamp: true,
      },
    });

    const trackerIds = currentLocations.map((location) => location.trackerId);

    const locations = await this.prismaService.location.findMany({
      where: {
        trackerId: {
          in: trackerIds,
        },
        timestamp: {
          in: currentLocations.map((location) => location._max.timestamp),
        },
      },
    });

    return locations;
  }

  async getTrackerLocationsHistoryQuery(
    trackerId: number,
    pageOptionsDto: PageOptionsDto
  ): Promise<PageDto<any>> {
    const result = await this.prismaService.location.findMany({
      skip: (pageOptionsDto.page - 1) * pageOptionsDto.take,
      take: pageOptionsDto.take,
      where: {
        trackerId,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    const count = await this.prismaService.location.count({
      where: {
        trackerId,
      },
    });

    return Promise.all([result, count]).then(([data, total]: [any, any]) => {
      const pageMetaDto = {
        page: pageOptionsDto.page,
        take: pageOptionsDto.take,
        itemCount: total,
        pageCount: Math.ceil(total / pageOptionsDto.take),
        hasPreviousPage: pageOptionsDto.page > 1,
        hasNextPage:
          pageOptionsDto.page < Math.ceil(total / pageOptionsDto.take),
      };
      return new PageDto(data, pageMetaDto);
    });
  }
}
