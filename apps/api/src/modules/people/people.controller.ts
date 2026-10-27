import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { JwtGuard } from '../identity/jwt.guard';
import { CurrentUser } from '../identity/current-user.decorator';
import { PeopleService } from './people.service';
import { BoardQueryDto } from './people.dto';

class HandleDto {
  @IsString()
  @Length(3, 20)
  handle!: string;
}

@Controller()
@UseGuards(JwtGuard)
export class PeopleController {
  constructor(private people: PeopleService) {}

  @Get('couriers/board')
  board(@CurrentUser() user: { id: string }, @Query() query: BoardQueryDto) {
    return this.people.board(user.id, { q: query.q, phase: query.phase, take: query.take });
  }

  @Get('couriers/top')
  top() {
    return this.people.top(20);
  }

  @Get('people/:handle')
  profile(@CurrentUser() user: { id: string }, @Param('handle') handle: string) {
    return this.people.profile(handle, user.id);
  }

  @Patch('me/handle')
  setHandle(@CurrentUser() user: { id: string }, @Body() dto: HandleDto) {
    return this.people.setHandle(user.id, dto.handle);
  }
}
