<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserStoreRequest;
use App\Http\Requests\UserUpdateRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

#[OA\Tag(name: 'Users', description: 'User management endpoints')]
class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    #[OA\Get(
        path: '/api/users',
        summary: 'List users',
        description: 'Paginated list with search and sorting',
        tags: ['Users'],
        parameters: [
            new OA\Parameter(
                name: 'filter[search]',
                in: 'query',
                description: 'Partial match on: name_lastname, name_firstname, name_kana_lastname, name_kana_firstname, email',
                schema: new OA\Schema(type: 'string'),
                example: '田中'
            ),
            new OA\Parameter(ref: '#/components/parameters/QueryPage'),
            new OA\Parameter(ref: '#/components/parameters/QueryPerPage'),
            new OA\Parameter(
                name: 'sort',
                in: 'query',
                description: 'Sort field. Prefix `-` for descending. Default: `-id`',
                schema: new OA\Schema(
                    type: 'string',
                    enum: ['id', '-id', 'name_lastname', '-name_lastname', 'name_firstname', '-name_firstname', 'email', '-email', 'created_at', '-created_at', 'updated_at', '-updated_at']
                ),
                example: '-created_at'
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Paginated user list',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/User')),
                        new OA\Property(property: 'links', ref: '#/components/schemas/PaginationLinks'),
                        new OA\Property(property: 'meta', ref: '#/components/schemas/PaginationMeta'),
                    ]
                )
            ),
        ]
    )]
    public function index(): AnonymousResourceCollection
    {
        $users = QueryBuilder::for(User::class)
            ->allowedFilters([
                AllowedFilter::callback('search', function ($query, $value) {
                    $query->where(function ($q) use ($value) {
                        $q->where('name_lastname', 'like', "%{$value}%")
                          ->orWhere('name_firstname', 'like', "%{$value}%")
                          ->orWhere('name_kana_lastname', 'like', "%{$value}%")
                          ->orWhere('name_kana_firstname', 'like', "%{$value}%")
                          ->orWhere('email', 'like', "%{$value}%");
                    });
                }),
            ])
            ->allowedSorts(['id', 'name_lastname', 'name_firstname', 'email', 'created_at', 'updated_at'])
            ->defaultSort('-id')
            ->paginate(request()->input('per_page', 10));

        return UserResource::collection($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    #[OA\Post(
        path: '/api/users',
        summary: 'Create user',
        description: 'Create a new user account',
        tags: ['Users'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/UserStoreRequest')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'User created',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', ref: '#/components/schemas/User'),
                    ]
                )
            ),
            new OA\Response(ref: '#/components/responses/ValidationError', response: 422),
        ]
    )]
    public function store(UserStoreRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    #[OA\Get(
        path: '/api/users/{id}',
        summary: 'Get user',
        description: 'Get user by ID',
        tags: ['Users'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/PathId'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'User details',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', ref: '#/components/schemas/User'),
                    ]
                )
            ),
            new OA\Response(ref: '#/components/responses/NotFound', response: 404),
        ]
    )]
    public function show(User $user): UserResource
    {
        return new UserResource($user);
    }

    /**
     * Update the specified resource in storage.
     */
    #[OA\Put(
        path: '/api/users/{id}',
        summary: 'Update user',
        description: 'Update user (partial update supported)',
        tags: ['Users'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/PathId'),
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/UserUpdateRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'User updated',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', ref: '#/components/schemas/User'),
                    ]
                )
            ),
            new OA\Response(ref: '#/components/responses/NotFound', response: 404),
            new OA\Response(ref: '#/components/responses/ValidationError', response: 422),
        ]
    )]
    public function update(UserUpdateRequest $request, User $user): UserResource
    {
        $user->update($request->validated());

        return new UserResource($user);
    }

    /**
     * Remove the specified resource from storage.
     */
    #[OA\Delete(
        path: '/api/users/{id}',
        summary: 'Delete user',
        description: 'Permanently delete user',
        tags: ['Users'],
        parameters: [
            new OA\Parameter(ref: '#/components/parameters/PathId'),
        ],
        responses: [
            new OA\Response(ref: '#/components/responses/NoContent', response: 204),
            new OA\Response(ref: '#/components/responses/NotFound', response: 404),
        ]
    )]
    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json(null, 204);
    }
}
