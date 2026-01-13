<?php

declare(strict_types=1);

namespace Omnify\SsoClient\Services;

use Lcobucci\JWT\Encoding\JoseEncoder;
use Lcobucci\JWT\Token\Parser;
use Lcobucci\JWT\Signer\Key\InMemory;
use Lcobucci\JWT\Signer\Rsa\Sha256;
use Lcobucci\JWT\Token\Plain;
use Lcobucci\JWT\Validation\Validator;
use Lcobucci\JWT\Validation\Constraint\SignedWith;
use Lcobucci\JWT\Validation\Constraint\StrictValidAt;
use Lcobucci\Clock\SystemClock;
use Omnify\SsoClient\Exceptions\ConsoleAuthException;

/**
 * JWT Token検証サービス
 * 
 * lcobucci/jwt v5.x対応
 */
class JwtVerifier
{
    private Parser $parser;
    private Validator $validator;

    public function __construct(
        private readonly JwksService $jwksService
    ) {
        $this->parser = new Parser(new JoseEncoder());
        $this->validator = new Validator();
    }

    /**
     * JWTトークンを検証してパースする
     *
     * @return array{sub: int, email: string, name: string, aud: string}|null
     */
    public function verify(string $token): ?array
    {
        try {
            // トークンをパースしてヘッダー(kid)を取得
            $parsedToken = $this->parser->parse($token);

            if (! $parsedToken instanceof Plain) {
                return null;
            }

            // ヘッダーからkey IDを取得
            $kid = $parsedToken->headers()->get('kid');
            if (! $kid) {
                throw new ConsoleAuthException('Token missing key ID');
            }

            // 公開鍵を取得
            $publicKey = $this->jwksService->getPublicKey($kid);
            if (! $publicKey) {
                throw new ConsoleAuthException('Public key not found for kid: '.$kid);
            }

            // トークンを検証
            $constraints = [
                new SignedWith(new Sha256(), InMemory::plainText($publicKey)),
                new StrictValidAt(SystemClock::fromSystemTimezone()),
            ];

            if (! $this->validator->validate($parsedToken, ...$constraints)) {
                return null;
            }

            // クレームを抽出
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
     * 検証なしでトークンからクレームを取得
     * 既に検証済みのトークンにのみ使用
     *
     * @return array<string, mixed>|null
     */
    public function getClaims(string $token): ?array
    {
        try {
            $parsedToken = $this->parser->parse($token);

            if (! $parsedToken instanceof Plain) {
                return null;
            }

            return $parsedToken->claims()->all();
        } catch (\Throwable) {
            return null;
        }
    }
}
