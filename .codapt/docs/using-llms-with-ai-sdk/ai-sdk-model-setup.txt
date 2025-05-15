To use many AI SDK functions you need to configure a model. You can import model providers from `@ai-sdk/openai`, `@ai-sdk/anthropic`, etc.

For example:

```
import { openai } from '@ai-sdk/openai';

// ...

const model = openai('gpt-4o'); // we pass the model name into the function

// ...
```

You don't need to pass any API key because it will be automatically pulled from an environment variable. For example, an openai model will automatically grab the OPENAI_API_KEY env var.

If you don't know what model to use, start with gpt-4o from openai.
