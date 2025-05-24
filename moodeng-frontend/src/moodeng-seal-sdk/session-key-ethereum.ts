import { bcs, toBase64 } from '@mysten/bcs';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateSecretKey, toPublicKey, toVerificationKey } from './elgamal';
import {
	ExpiredSessionKeyError,
	InvalidPersonalMessageSignatureError,
	UserError,
} from './error';
import { verifyMessage, isAddress } from 'viem';


// Keep original RequestFormat name but use bcs for Solana
export const RequestFormat = bcs.struct('RequestFormat', {
	ptb: bcs.vector(bcs.u8()),
	encKey: bcs.vector(bcs.u8()),
	encVerificationKey: bcs.vector(bcs.u8()),
});

// Keep original Certificate type name
export type Certificate = {
	user: string;
	session_vk: string; 
	creation_time: number;
	ttl_min: number;
	signature: string;
};

// Keep original SessionKeyType name
export type SessionKeyType = {
	address: string;
	packageId: string; // Keep packageId name for consistency
	creationTimeMs: number;
	ttlMin: number;
	personalMessageSignature?: string;
	sessionKey: string;
};

// Keep original Signer interface name but adapt for Ethereum
export interface Signer {
	// Get the Ethereum address
	getAddress(): string;
	
	// Sign a message using Ethereum's personal_sign method
	signPersonalMessage(message: Uint8Array): Promise<{ signature: string }>;
}

// Helper function to convert Ethereum address to Sui format (32 bytes)
function toSuiAddress(ethAddress: string): string {
	// Remove 0x prefix if present
	const cleanAddress = ethAddress.startsWith('0x') ? ethAddress.slice(2) : ethAddress;
	// Pad with zeros to make it 64 characters (32 bytes)
	return '0x' + cleanAddress.padStart(64, '0');
}

// Keep original SessionKey class name
export class SessionKey {
	#address: string;
	#packageId: string;
	#creationTimeMs: number;
	#ttlMin: number;
	#sessionKey: Ed25519Keypair;
	#personalMessageSignature?: string;
	#signer?: Signer;

	constructor({
		address,
		packageId, // Keep packageId parameter name for consistency
		ttlMin,
		signer,
	}: {
		address: string;
		packageId: string; // Keep packageId parameter name for consistency
		ttlMin: number;
		signer?: Signer;
	}) {
		if (!isAddress(packageId) || !isAddress(address)) {
			throw new UserError(`Invalid package ID ${packageId} or address ${address}`);
		}
		if (ttlMin > 30 || ttlMin < 1) {
			throw new UserError(`Invalid TTL ${ttlMin}, must be between 1 and 30`);
		}

		// Validate signer if provided
		if (this.#signer && this.#signer.getAddress() !== address) {
			throw new UserError('Signer address does not match session key address');
		}

		this.#address = address;
		this.#packageId = packageId;
		this.#creationTimeMs = Date.now();
		this.#ttlMin = ttlMin;
		this.#sessionKey = Ed25519Keypair.generate();
		this.#signer = signer;
	}

	isExpired(): boolean {
		// Allow 10 seconds for clock skew, same as Sui implementation
		return this.#creationTimeMs + this.#ttlMin * 60 * 1000 - 10_000 < Date.now();
	}

	getAddress(): string {
		return this.#address;
	}

	getProgramId(): string {
		return this.#packageId;
	}

	getPackageId(): string {
		// Convert Ethereum address (20 bytes) to Sui format (32 bytes)
		return toSuiAddress(this.#packageId);
	}

	getPersonalMessage(): Uint8Array {
		const creationTimeUtc =
			new Date(this.#creationTimeMs).toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
		const message = `Accessing keys of package ${this.#packageId} for ${this.#ttlMin} mins from ${creationTimeUtc}, session key ${toBase64(this.#sessionKey.getPublicKey().toRawBytes())}`;
		return new TextEncoder().encode(message);
	}
	
	async setPersonalMessageSignature(personalMessageSignature: string) {
		try {
			// Get the personal message bytes
			const message = this.getPersonalMessage();
			
			// Verify signature using viem's verifyMessage
			const isValid = await verifyMessage({
				address: this.#address as `0x${string}`,
				message: Buffer.from(message).toString(),
				signature: personalMessageSignature as `0x${string}`
			});
			
			if (!isValid) {
				throw new Error('Invalid signature: verification failed');
			}
			
			this.#personalMessageSignature = personalMessageSignature;
		} catch (e) {
			throw new InvalidPersonalMessageSignatureError('Signature verification failed: ' + (e as Error).message);
		}
	}

	async getCertificate(): Promise<Certificate> {
		if (!this.#personalMessageSignature) {
			if (this.#signer) {
				const { signature } = await this.#signer.signPersonalMessage(this.getPersonalMessage());
				this.#personalMessageSignature = signature;
			} else {
				throw new InvalidPersonalMessageSignatureError('Personal message signature is not set');
			}
		}

		const message = this.getPersonalMessage();
		
		const isValid = await verifyMessage({
			address: this.#address as `0x${string}`,
			message: Buffer.from(message).toString(),
			signature: this.#personalMessageSignature as `0x${string}`
		});

		if (!isValid) {
			throw new InvalidPersonalMessageSignatureError('Signature verification failed');
		}
		
		return {
			user: this.#address,
			session_vk: toBase64(this.#sessionKey.getPublicKey().toRawBytes()),
			creation_time: this.#creationTimeMs,
			ttl_min: this.#ttlMin,
			signature: this.#personalMessageSignature,
		};
	}

	async createRequestParams(
		txBytes: Uint8Array,
	): Promise<{ decryptionKey: Uint8Array; requestSignature: string }> {
		if (this.isExpired()) {
			throw new ExpiredSessionKeyError();
		}
		
		const egSk = generateSecretKey();
		// Use BCS serialization with the original RequestFormat
		const msgToSign = RequestFormat.serialize({
			// Solana transaction has been prepended with a dummy byte
			// so it is ok to be sliced here
			ptb: txBytes.slice(1),
			encKey: toPublicKey(egSk),
			encVerificationKey: toVerificationKey(egSk),
		}).toBytes();

		console.log("Request message to sign (hex):", Buffer.from(msgToSign).toString("hex"));
		console.log("Request message to sign (base64):", Buffer.from(msgToSign).toString("base64"));

		return {
			decryptionKey: egSk,
			requestSignature: toBase64(await this.#sessionKey.sign(msgToSign)),
		};
	}

	/**
	 * Export the Session Key object from the instance.
	 */
	export(): SessionKeyType {
		const obj = {
			address: this.#address,
			packageId: this.#packageId,
			creationTimeMs: this.#creationTimeMs,
			ttlMin: this.#ttlMin,
			personalMessageSignature: this.#personalMessageSignature,
			sessionKey: this.#sessionKey.getSecretKey(), // Keep original format
		};

		Object.defineProperty(obj, 'toJSON', {
			enumerable: false,
			value: () => {
				throw new Error('This object is not serializable');
			},
		});
		
		return obj;
	}

	/**
	 * Restore a SessionKey instance from exported data.
	 */
	static async import(
		data: SessionKeyType, 
		{ signer }: { signer?: Signer }
	): Promise<SessionKey> {
		const instance = new SessionKey({
			address: data.address,
			packageId: data.packageId,
			ttlMin: data.ttlMin,
			signer,
		});

		instance.#creationTimeMs = data.creationTimeMs;
		instance.#sessionKey = Ed25519Keypair.fromSecretKey(data.sessionKey);

		if (data.personalMessageSignature) {
			await instance.setPersonalMessageSignature(data.personalMessageSignature);
		}

		return instance;
	}
}
