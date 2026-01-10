---
globs: ["backend/**"]
---

# Backend Rules (Laravel)

> **Full documentation:** `.claude/laravel/`
> - `datetime-guide.md` - Carbon, UTC, API Date Format

## Critical Rules

1. **Timezone UTC** - `config/app.php` timezone must be `UTC`
2. **Use Carbon** - Never use raw `DateTime`, `date()`, or `strtotime()`
3. **API dates as ISO 8601** - Return `->toISOString()` for all dates
4. **Use Resources** - Never return Eloquent models directly in API
5. **Ask before installing** - No `composer require` without permission

---

## DateTime Contract

| Direction      | Format        | Example                         |
| -------------- | ------------- | ------------------------------- |
| API → Frontend | ISO 8601 UTC  | `"2024-01-15T10:30:00.000000Z"` |
| Frontend → API | ISO 8601 UTC  | `"2024-01-15T10:30:00.000Z"`    |
| Database       | UTC Timestamp | `2024-01-15 10:30:00`           |

---

## Quick Reference

### Model with Dates

```php
protected $casts = [
    'scheduled_at' => 'datetime',
];
```

### Resource Date Format

```php
public function toArray($request): array
{
    return [
        'id' => $this->id,
        'scheduled_at' => $this->scheduled_at?->toISOString(),  // ✅ ISO 8601
        'created_at' => $this->created_at?->toISOString(),
    ];
}
```

### Date Query

```php
use Illuminate\Support\Carbon;

Event::where('scheduled_at', '>=', Carbon::parse($request->start_date))
     ->where('scheduled_at', '<=', Carbon::parse($request->end_date))
     ->get();
```

---

## Common Mistakes

```php
// ❌ Wrong timezone config
'timezone' => 'Asia/Tokyo',
// ✅ Always UTC
'timezone' => 'UTC',

// ❌ Raw PHP date
$date = date('Y-m-d H:i:s');
$date = new \DateTime();
// ✅ Use Carbon
$date = Carbon::now();

// ❌ Format local date in API
'created_at' => $this->created_at->format('Y/m/d'),
// ✅ Return ISO 8601
'created_at' => $this->created_at?->toISOString(),

// ❌ Store with timezone offset
'scheduled_at' => '2024-01-15T19:30:00+09:00',
// ✅ Store UTC
'scheduled_at' => Carbon::parse($input),  // Input is UTC
```
