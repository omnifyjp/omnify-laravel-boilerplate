<?php

declare(strict_types=1);

namespace Omnify\SsoClient\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Omnify\SsoClient\Services\ConsoleApiService;
use Omnify\SsoClient\Services\ConsoleTokenService;
use Omnify\SsoClient\Services\JwtVerifier;
use Omnify\SsoClient\Services\OrgAccessService;

class SsoCallbackController extends Controller
{
    public function __construct(
        private readonly ConsoleApiService $consoleApi,
        private readonly JwtVerifier $jwtVerifier,
        private readonly ConsoleTokenService $tokenService,
        private readonly OrgAccessService $orgAccessService
    ) {}

    /**
     * Handle SSO callback.
     * Exchange code for tokens, create/update user, return auth response.
     */
    public function callback(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:255'], // For mobile apps
        ]);

        // Exchange code for tokens
        $tokens = $this->consoleApi->exchangeCode($validated['code']);

        if (! $tokens) {
            return response()->json([
                'error' => 'INVALID_CODE',
                'message' => 'Failed to exchange SSO code',
            ], 401);
        }

        // Verify JWT and get user info
        $claims = $this->jwtVerifier->verify($tokens['access_token']);

        if (! $claims) {
            return response()->json([
                'error' => 'INVALID_TOKEN',
                'message' => 'Failed to verify access token',
            ], 401);
        }

        // Find or create user
        $userModel = config('sso-client.user_model');
        $user = $userModel::where('console_user_id', $claims['sub'])->first();

        if (! $user) {
            // Create new user
            $user = new $userModel();
            $user->console_user_id = $claims['sub'];
            $user->email = $claims['email'];
            $user->name = $claims['name'];
        } else {
            // Update existing user
            $user->email = $claims['email'];
            $user->name = $claims['name'];
        }

        // Store Console tokens
        $this->tokenService->storeTokens($user, $tokens);

        // Get organizations
        $organizations = $this->orgAccessService->getOrganizations($user);

        // Create authentication
        $response = [
            'user' => [
                'id' => $user->id,
                'console_user_id' => $user->console_user_id,
                'email' => $user->email,
                'name' => $user->name,
            ],
            'organizations' => $organizations,
        ];

        // Mobile app: Create API token
        if (! empty($validated['device_name'])) {
            $token = $user->createToken($validated['device_name']);
            $response['token'] = $token->plainTextToken;
        } else {
            // Web: Create session
            Auth::login($user);
        }

        return response()->json($response);
    }

    /**
     * Logout user.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            // Revoke Console tokens
            $this->tokenService->revokeTokens($user);

            // Delete current token (for API token auth)
            if ($request->bearerToken()) {
                $user->currentAccessToken()?->delete();
            }

            // Logout from session
            Auth::guard('web')->logout();
        }

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get current authenticated user.
     */
    public function user(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'error' => 'UNAUTHENTICATED',
                'message' => 'Not authenticated',
            ], 401);
        }

        // Get organizations
        $organizations = $this->orgAccessService->getOrganizations($user);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'console_user_id' => $user->console_user_id,
                'email' => $user->email,
                'name' => $user->name,
            ],
            'organizations' => $organizations,
        ]);
    }

    /**
     * Get global logout URL for Console.
     */
    public function globalLogoutUrl(Request $request): JsonResponse
    {
        $redirectUri = $request->query('redirect_uri', url('/'));

        $logoutUrl = $this->consoleApi->getConsoleUrl().'/sso/logout?'.http_build_query([
            'redirect_uri' => $redirectUri,
        ]);

        return response()->json([
            'logout_url' => $logoutUrl,
        ]);
    }
}
