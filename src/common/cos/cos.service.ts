// import { Injectable } from '@nestjs/common';
// import * as COS from 'cos-nodejs-sdk-v5';
//
// @Injectable()
// export class CosService {
//   private cos: COS;
//
//   constructor() {
//     this.cos = new COS({
//       SecretId: process.env.COS_SECRET_ID,
//       SecretKey: process.env.COS_SECRET_KEY,
//     });
//   }
//
//   async uploadFile(file: File, key: string): Promise<string> {
//     const Bucket = process.env.COS_BUCKET as string;
//     const Region = process.env.COS_REGION   as string;
//
//     return new Promise((resolve, reject) => {
//       this.cos.putObject(
//         {
//           Bucket,
//           Region,
//           Key: key, // 文件在 COS 上的路径
//           Body: file.buffer,
//           ContentType: file.mimetype,
//         },
//         (err, data) => {
//           if (err) return reject(err);
//           // 拼接文件访问 URL
//           const url = `https://${Bucket}.cos.${Region}.myqcloud.com/${key}`;
//           resolve(url);
//         },
//       );
//     });
//   }
// }