import { rmSync } from 'node:fs';

// Next dev retains validators for routes deleted during canonical-route cleanup.
// Removing generated route types is safe; next typegen recreates the current set.
rmSync('.next/dev/types', { recursive: true, force: true });
rmSync('.next/types', { recursive: true, force: true });
