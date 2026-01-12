<?php

declare(strict_types=1);

namespace Omnify\SsoClient\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class SsoTokenController extends Controller
{
    /**
     * List all API tokens for current user.
     * For mobile apps to manage their tokens.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $tokens = $user->tokens()
            ->orderBy('last_used_at', 'desc')
            ->get()
            ->map(fn ($token) => [
                'id' => $token->id,
                'name' => $token->name,
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'created_at' => $token->created_at->toIso8601String(),
                'is_current' => $token->id === $user->currentAccessToken()?->id,
            ]);

        return response()->json([
            'tokens' => $tokens,
        ]);
    }

    /**
     * Revoke a specific token.
     */
    public function destroy(Request $request, int $tokenId): JsonResponse
    {
        $user = $request->user();

        $token = $user->tokens()->find($tokenId);

        if (! $token) {
            return response()->json([
                'error' => 'TOKEN_NOT_FOUND',
                'message' => 'Token not found',
            ], 404);
        }

        $token->delete();

        return response()->json([
            'message' => 'Token revoked successfully',
        ]);
    }

    /**
     * Revoke all tokens except current.
     */
    public function revokeOthers(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentTokenId = $user->currentAccessToken()?->id;

        $count = $user->tokens()
            ->when($currentTokenId, fn ($query) => $query->where('id', '!=', $currentTokenId))
            ->delete();

        return response()->json([
            'message' => 'Tokens revoked successfully',
            'revoked_count' => $count,
        ]);
    }
}
