import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Session } from './session.schema.js';
import mongoose, { Error, Model } from 'mongoose';
import { User, UserSchema } from './auth.schema.js';
import { getModelToken } from '@nestjs/mongoose';
import { Response } from 'express';
import { dummyUsers } from '../../tests/constants.js';
import { mockAuthService } from '../__mocks__/auth.service.mock.js';
import sessionFixtures from '../__fixtures__/session.fixtures.json';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;
  let userModel: Model<User>;

  beforeEach(async () => {
    userModel = mongoose.model('User', UserSchema);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { ...mockAuthService },
        },
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    authController = moduleRef.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('Get /keys', () => {
    it('(OK) should return a user from their session', async () => {
      const dummyUser = dummyUsers[0];
      const user = await authController.keys(sessionFixtures.authorized);

      expect(user).toBe(dummyUser);
    });

    it('(FAIL) should fail when mongo db throws an error', async () => {
      authService.find = jest
        .fn()
        .mockRejectedValue(new Error('failed to retrieve user'));

      const session = new Session();

      await expect(authController.keys(session)).rejects.toThrow();
    });
  });

  describe('Delete /keys/:id', () => {
    it('(OK) should return success: true when removeCredential succeeds', async () => {
      const session = new Session();
      await expect(authController.remove(session, `1`)).resolves.toEqual({
        success: true,
      });
    });

    it('(FAIL) should fail if it cannot find the user', async () => {
      authService.find = jest.fn().mockResolvedValue(undefined);

      const session = {} as Record<string, any>;
      await expect(authController.remove(session, `1`)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('(FAIL) should fail when mongo db throws an error', async () => {
      authService.find = jest
        .fn()
        .mockRejectedValue(new Error('failed to find user'));

      const session = new Session();
      await expect(authController.remove(session, `1`)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('(FAIL) should fail if it cannot remove the credential', async () => {
      authService.removeCredential = jest
        .fn()
        .mockRejectedValue(new Error('failed to update user'));

      const session = new Session();

      await expect(authController.remove(session, `1`)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Post /logout', () => {
    it('(OK) should destroy the session and clear the cookie', async () => {
      const session = Object.assign(new Session(), {
        destroy: jest.fn((cb: (err?: Error | null) => void) => cb(null)),
      });
      const res = {
        req: {
          secure: true,
          headers: {},
        },
        clearCookie: jest.fn(),
      } as any as Response;

      await expect(authController.logout(session, res)).resolves.toEqual({
        success: true,
      });
      expect(session.destroy).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith(
        'connect.sid',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          secure: true,
          path: '/',
        }),
      );
    });

    it('(FAIL) should fail when session destroy errors', async () => {
      const session = Object.assign(new Session(), {
        destroy: jest.fn((cb: (err?: Error | null) => void) =>
          cb(new Error('destroy failed')),
        ),
      });
      const res = {
        req: {
          secure: false,
          headers: {},
        },
        clearCookie: jest.fn(),
      } as any as Response;

      await expect(authController.logout(session, res)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Get /logout', () => {
    it('(OK) should destroy the session, clear the cookie, and redirect', async () => {
      const session = Object.assign(new Session(), {
        destroy: jest.fn((cb: (err?: Error | null) => void) => cb(null)),
      });
      const res = {
        req: {
          secure: true,
          headers: {},
        },
        clearCookie: jest.fn(),
        redirect: jest.fn(),
      } as any as Response;

      await authController.logoutBrowser(session, res);
      expect(session.destroy).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(302, '/');
    });
  });

  describe('Get /session', () => {
    it('(OK) should fetch a session', async () => {
      const dummyUser = dummyUsers[0];
      const user = await authController.read(sessionFixtures.authorized);
      await expect(user).toStrictEqual({
        user: dummyUser,
        session: sessionFixtures.authorized,
      });
    });

    it('(OK) should return an empty object if the user is not found', async () => {
      authService.find = jest.fn().mockResolvedValue(null);
      await expect(
        authController.read(sessionFixtures.authorized),
      ).resolves.toEqual({ session: sessionFixtures.authorized, user: null });
    });
  });
});
