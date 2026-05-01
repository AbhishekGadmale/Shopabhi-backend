import jwt from "jsonwebtoken";
import { config } from "../config/config.js";

export const signAccessToken = (payload) => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

export const signRefreshToken = (payload) => {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, config.JWT_SECRET);
};

export const verifyExpireToken = (token) => {
  return jwt.verify(token, config.JWT_REFRESH_SECRET);
};
