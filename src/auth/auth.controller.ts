import {
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Res,
  Session,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from './auth.schema.js';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private destroySessionAndClearCookie(session: Record<string, any>, res: Response) {
    const req = (res.req || null) as Request | null;
    const secure =
      req?.secure ||
      req?.headers?.['x-forwarded-proto'] === 'https' ||
      process.env.SESSION_SECURE === 'true';

    return new Promise<{ success: true }>((resolve, reject) => {
      session.destroy?.((err?: Error | null) => {
        if (err) {
          reject(
            new InternalServerErrorException({
              error: 'Failed to destroy session',
            }),
          );
          return;
        }
        res.clearCookie('connect.sid', {
          httpOnly: true,
          sameSite: 'lax',
          secure,
          path: '/',
        });
        resolve({ success: true });
      });
    });
  }

  /**
   * Display user keys
   *
   * @param session
   */
  @Get('/user')
  @ApiOperation({ summary: 'Get User' })
  @ApiResponse({ status: 200, description: 'Get the current user', type: User })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  async keys(@Session() session: Record<string, any>) {
    const wallet = session.wallet;
    return await this.authService.find(wallet);
  }
  /**
   * Delete Credential
   *
   * @param session - Express Session
   * @param id
   */
  @Delete('/keys/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete Credential' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiCookieAuth()
  async remove(
    @Session() session: Record<string, any>,
    @Param('id') id: string,
  ) {
    try {
      const user = await this.authService.find(session.wallet);

      if (!user) {
        throw new NotFoundException({
          error: 'User not found',
        });
      }

      await this.authService.removeCredential(user, id);

      return { success: true };
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }

      throw new InternalServerErrorException({
        error: e.message,
      });
    }
  }

  @Post('/logout')
  @ApiOperation({ summary: 'Log Out API' })
  logout(
    @Session() session: Record<string, any>,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.destroySessionAndClearCookie(session, res);
  }

  @Get('/logout')
  @ApiOperation({ summary: 'Log Out Browser Route' })
  async logoutBrowser(
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    await this.destroySessionAndClearCookie(session, res);
    return res.redirect(302, '/');
  }
  /**
   * Read Session
   *
   * @param session
   */
  @Get('/session')
  @ApiOperation({ summary: 'Get Session' })
  async read(@Session() session: Record<string, any>) {
    const user = await this.authService.find(session.wallet);
    return {
      user: user
        ? {
            id: user.id,
            wallet: user.wallet,
            credentials: user.credentials,
          }
        : null,
      session,
    };
  }
}
