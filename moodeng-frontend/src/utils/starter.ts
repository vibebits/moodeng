import { stringToBytes, bytesToHex } from 'viem';

export async function getFullEncryptionId(encryptionId: string) {

    const encryptionIdBytes32 = stringToBytes(encryptionId, { size: 32 });
    const encryptionIdBytes32Hex = bytesToHex(encryptionIdBytes32);

    console.log("getFullEncryptionId", encryptionId, encryptionIdBytes32Hex);
    
    return encryptionIdBytes32Hex;
}