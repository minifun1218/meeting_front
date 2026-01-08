import * as CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';

/**
 * 加密工具类
 * 使用 RSA + AES 混合加密方案
 * 1. 生成随机 AES 密钥
 * 2. 使用 AES 密钥加密密码（使用 UUID 作为 IV）
 * 3. 使用 RSA 公钥加密 AES 密钥
 * 4. 返回加密后的数据和加密后的密钥
 */
export class CryptoUtil {
  /**
   * 生成随机 AES 密钥（256位）
   * @returns 随机 AES 密钥
   */
  static generateAESKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  /**
   * 使用 AES 加密数据
   * @param data 原始数据
   * @param aesKey AES 密钥
   * @param uuid UUID 作为 IV
   * @returns 加密后的数据（Base64）
   */
  static encryptWithAES(data: string, aesKey: string, uuid: string): string {
    if (!data || !aesKey || !uuid) {
      return '';
    }

    try {
      // 将 UUID 转换为 WordArray 作为 IV
      const iv = CryptoJS.enc.Utf8.parse(uuid.substring(0, 16).padEnd(16, '0'));
      const key = CryptoJS.enc.Utf8.parse(aesKey.substring(0, 32).padEnd(32, '0'));

      const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return encrypted.toString();
    } catch (error) {
      console.error('AES 加密失败:', error);
      return '';
    }
  }

  /**
   * 使用 RSA 公钥加密 AES 密钥
   * @param aesKey AES 密钥
   * @param publicKey RSA 公钥（PEM 格式）
   * @returns 加密后的 AES 密钥（Base64）
   */
  static encryptAESKeyWithRSA(aesKey: string, publicKey: string): string {
    if (!aesKey || !publicKey) {
      return '';
    }

    try {
      const encrypt = new JSEncrypt();
      encrypt.setPublicKey(publicKey);
      const encrypted = encrypt.encrypt(aesKey);
      return encrypted || '';
    } catch (error) {
      console.error('RSA 加密失败:', error);
      return '';
    }
  }

  /**
   * 加密密码的完整流程
   * @param password 原始密码
   * @param publicKey RSA 公钥
   * @param uuid UUID（用作 IV）
   * @returns 包含加密密码和加密密钥的对象
   */
  static encryptPassword(password: string, publicKey: string, uuid: string): {
    encryptedPassword: string;
    encryptedKey: string;
  } {
    // 1. 生成随机 AES 密钥
    const aesKey = this.generateAESKey();

    // 2. 使用 AES 密钥加密密码
    const encryptedPassword = this.encryptWithAES(password, aesKey, uuid);

    // 3. 使用 RSA 公钥加密 AES 密钥
    const encryptedKey = this.encryptAESKeyWithRSA(aesKey, publicKey);

    return {
      encryptedPassword,
      encryptedKey
    };
  }
}
