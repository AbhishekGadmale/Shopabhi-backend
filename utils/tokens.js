import jwt from "jsonwebtoken";

export const signAccessToken= (payload)=>{
  return jwt.sign(payload,process.env.ACCESS_TOKEN_SECRET,{
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m",
  });
};

export const signRefreshToken = (payload)=>{
    return jwt.sign(payload,process.env.REFRESH_TOKEN_SECRET,{
        expiresIn:
      process.env.REFRESH_TOKEN_SECRET || "30d",
    });
};

export const verifyAccessToken = (token)=>{
    return jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
};

export const verifyExpireToken=(token)=>{
  return jwt.verify(token,process.env.REFRESH_TOKEN_SECRET)
}