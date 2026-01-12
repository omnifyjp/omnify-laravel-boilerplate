<?php

declare(strict_types=1);

namespace Omnify\SsoClient\Services;

use Lcobucci\JWT\Configuration;
use Lcobucci\JWT\Signer\Key\InMemory;
use Lcobucci\JWT\Signer\Rsa\Sha256;
use Lcobucci\JWT\Token\Plain;
use Lcobucci\JWT\Validation\Constraint\SignedWith;
use Lcobucci\JWT\Validation\Constraint\StrictValidAt;
use Lcobucci\Clock\SystemClock;
use Omnify\SsoClient\Exceptions\ConsoleAuthException;

class JwtVerifier
{
    public function __construct(
        private readonly JwksService $jwksService
    ) {}

    /**
     * Verify and parse a JWT token.
     *
     * @return array{sub: int, email: string, name: string, aud: string}|null
     */
    public function verify(string $token): ?array
    {
        try {
            // Parse token to get header (kid)
            $config = Configuration::forUnsecuredSigner();
            $parsedToken = $config->parser()->parse($token);

            if (! $parsedToken instanceof Plain) {
                return null;
            }

            // Get key ID from header
            $kid = $parsedToken->headers()->get('kid');
            if (! $kid) {
                throw new ConsoleAuthException('Token missing key ID');
            }

            // Get public key
            $publicKey = $this->jwksService->getPublicKey($kid);
            if (! $publicKey) {
                throw new ConsoleAuthException('Public key not found for kid: '.$kid);
            }

            // Create configuration with proper key
            $config = Configuration::forSymmetricSigner(
                new Sha256(),
                InMemory::plainText($publicKey)
            );

            // Re-parse with proper config
            $parsedToken = $config->parser()->parse($token);

            if (! $parsedToken instanceof Plain) {
                return null;
            }

            // Validate token
            $constraints = [
                new SignedWith(new Sha256(), InMemory::plainText($publicKey)),
                new StrictValidAt(SystemClock::fromSystemTimezone()),
            ];

            if (! $config->validator()->validate($parsedToken, ...$constraints)) {
                return null;
            }

            // Extract claims
            return [
                'sub' => (int) $parsedToken->claims()->get('sub'),
                'email' => $parsedToken->claims()->get('email'),
                'name' => $parsedToken->claims()->get('name'),
                'aud' => $parsedToken->claims()->get('aud'),
            ];
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }

    /**
     * Get claims from a token without verification.
     * Use only when token has already been verified.
     *
     * @return array<string, mixed>|null
     */
    public function getClaims(string $token): ?array
    {
        try {
            $config = Configuration::forUnsecuredSigner();
            $parsedToken = $config->parser()->parse($token);

            if (! $parsedToken instanceof Plain) {
                return null;
            }

            return $parsedToken->claims()->all();
        } catch (\Throwable) {
            return null;
        }
    }
}
