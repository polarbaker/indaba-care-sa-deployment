Models are stored in `prisma/schema.prisma`.

In the backend, we can access the database via Prisma. Here's an example:

```
import { db } from "~/server/db";

// ...
await db.someTable.create({
  data: {
    someField: "some value",
  }
})
// ...
```

Our CI pipeline automatically migrates data, so do not try to generate Prisma migrations.
