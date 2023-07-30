export type Env = Record<string, string | undefined>;

// Looks like ${...} but not \${...}
const envVariablePattern = /(?:^|[^\\])\$(({([a-zA-Z_]+)})|([a-zA-Z_]+))/g;

export const enum ReplaceOption {
  Ignore,
}

export function applyEnvToString(
  input: string,
  env: Env,
  options?: { replaceUndefinedEnvWith: ReplaceOption | string | undefined }
): string {
  const output = input.replace(
    envVariablePattern,
    (match, _a, _b, name1, name2) => {
      if (name1 === undefined && name2 === undefined) {
        return match;
      }

      const name = name1 === undefined ? name2 : name1;
      let value = env[name.trim()];

      if (value === undefined) {
        if (options?.replaceUndefinedEnvWith === ReplaceOption.Ignore) {
          return match;
        }
        value = options?.replaceUndefinedEnvWith ?? "";
      }

      if (!match.startsWith("$")) {
        value = match[0] + value;
      }

      return value;
    }
  );

  return output;
}

export function extractEnvNames(input: string): string[] {
  const envs: string[] = [];

  input.replace(envVariablePattern, (match, _a, _b, name1, name2) => {
    if (name1 === undefined && name2 === undefined) {
      return match;
    }

    const name = name1 === undefined ? name2 : name1;
    envs.push(name);

    return match;
  });

  return envs;
}

type GraphEntry = {
  ins: string[];
  outs: string[];
};

function makeDepGraph(env: Env): Record<string, GraphEntry | undefined> {
  const graph: Record<string, GraphEntry | undefined> = {};

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      continue;
    }
    const deps = extractEnvNames(value).filter((d) => env[d] !== undefined);

    const entry = graph[key] ?? { ins: [], outs: [] };
    entry.outs = deps;

    for (const name of deps) {
      if (env[name] === undefined) {
        continue;
      }
      const ent = graph[name] ?? { ins: [], outs: [] };
      ent.ins.push(key);
      graph[name] = ent;
    }

    graph[key] = entry;
  }

  return graph;
}

function depSort(env: Env): string[] {
  const order: string[] = [];
  const graph = makeDepGraph(env);

  let starts: { key: string; entry: GraphEntry }[] = [];
  for (const [key, entry] of Object.entries(graph)) {
    if (entry === undefined) {
      continue;
    }
    if (entry.outs.length === 0) {
      starts.push({ key, entry });
    }
  }

  while (starts.length !== 0) {
    const { key, entry } = starts[0];
    starts = starts.slice(1);

    order.push(key);

    for (const n of entry.ins) {
      const ent = graph[n];
      if (ent === undefined) {
        continue;
      }

      ent.outs = ent.outs.filter((k) => k !== key);
      if (ent.outs.length === 0) {
        starts.push({ key: n, entry: ent });
      }
    }
  }

  if (order.length !== Object.entries(env).length) {
    throw new Error("cycle detected in environment reference");
  }

  return order;
}

export function expandEnv(
  env: Env,
  baseEnv?: Env,
  options?: { replaceUndefinedEnvWith: ReplaceOption | string | undefined }
): Env {
  const order = depSort(env);
  const newEnv: Env = {};
  baseEnv = baseEnv ?? {};

  for (const key of order) {
    const value = env[key] ?? "";
    const newValue = applyEnvToString(value, layeredEnv(newEnv, baseEnv), {
      replaceUndefinedEnvWith: options?.replaceUndefinedEnvWith,
    });
    newEnv[key] = newValue;
  }

  return newEnv;
}

export function layeredEnv(...envs: Env[]): Env {
  if (envs.length == 0) {
    return {};
  }

  envs = envs.reverse();

  const env = {
    ...envs[0],
  };

  for (const curr of envs.slice(1)) {
    for (const [k, v] of Object.entries(curr)) {
      env[k] = v;
    }
  }

  return env;
}
