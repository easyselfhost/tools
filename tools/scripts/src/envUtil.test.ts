import {
  Env,
  ReplaceOption,
  applyEnvToString,
  expandEnv,
  extractEnvNames,
  layeredEnv,
} from "./envUtil.js";

type ReplaceEnvTestCase = {
  input: string;
  env: Env;
  expected: string;
};

describe("test applyEnvToString", () => {
  test("replace multiple env variable", () => {
    const cases: ReplaceEnvTestCase[] = [
      {
        input: "${WHO} has a file in ${ROOT}/${PATH}",
        env: {
          WHO: "Bob",
          ROOT: "/home/bob",
          PATH: "a/b/c",
        },
        expected: "Bob has a file in /home/bob/a/b/c",
      },
      {
        input: "$WHO has a file in $ROOT/$PATH",
        env: {
          WHO: "Bob",
          ROOT: "/home/bob",
          PATH: "a/b/c",
        },
        expected: "Bob has a file in /home/bob/a/b/c",
      },
      {
        input: "$WHO has a file in ${ROOT}/$PATH",
        env: {
          WHO: "Bob",
          ROOT: "/home/bob",
          PATH: "a/b/c",
        },
        expected: "Bob has a file in /home/bob/a/b/c",
      },
      {
        input: "I need $B",
        env: {
          B: "Bob",
        },
        expected: "I need Bob",
      },
    ];

    for (const c of cases) {
      expect(applyEnvToString(c.input, c.env)).toBe(c.expected);
    }
  });

  test("replace env variable not defined with empty string", () => {
    const cases: ReplaceEnvTestCase[] = [
      {
        input: "${WHO} has a file in ${ROOT}/${PATH}",
        env: {
          WHO: "Bob",
          ROOT: "/home/bob",
        },
        expected: "Bob has a file in /home/bob/",
      },
      {
        input: "$WHO has a file in $ROOT/$PATH",
        env: {
          WHO: "Bob",
          ROOT: "/home/bob",
        },
        expected: "Bob has a file in /home/bob/",
      },
      {
        input: "$WHO has a file in $ROOT/${PATH}",
        env: {
          WHO: "Bob",
          ROOT: "/home/bob",
        },
        expected: "Bob has a file in /home/bob/",
      },
    ];

    for (const c of cases) {
      expect(applyEnvToString(c.input, c.env)).toBe(c.expected);
      expect(
        applyEnvToString(c.input, c.env, { replaceUndefinedEnvWith: "" })
      ).toBe(c.expected);
    }
  });

  test("ignore env variable not defined", () => {
    const cases: ReplaceEnvTestCase[] = [
      {
        input: "${WHO} has a file in ${ROOT}/${PATH}",
        env: {
          WHO: "Bob",
          ROOT: "/home/bob",
        },
        expected: "Bob has a file in /home/bob/${PATH}",
      },
      {
        input: "$WHO has a file in $ROOT/$PATH",
        env: {
          WHO: "Bob",
          ROOT: "/home/bob",
        },
        expected: "Bob has a file in /home/bob/$PATH",
      },
      {
        input: "$WHO has a file in $ROOT/${PATH}",
        env: {
          WHO: "Bob",
          ROOT: "/home/bob",
        },
        expected: "Bob has a file in /home/bob/${PATH}",
      },
    ];

    for (const c of cases) {
      expect(
        applyEnvToString(c.input, c.env, {
          replaceUndefinedEnvWith: ReplaceOption.Ignore,
        })
      ).toBe(c.expected);
    }
  });

  test("replace multiline string with env variables", () => {
    const input = `
      files:
        - from: ./Caddyfile
          to: \${CONFIG_PATH}/caddy/Caddyfile
    `;

    const output = applyEnvToString(input, {
      CONFIG_PATH: "/home/bob",
    });

    const expected = `
      files:
        - from: ./Caddyfile
          to: /home/bob/caddy/Caddyfile
    `;
    expect(output).toBe(expected);
  });

  test("preserve the string without variable", () => {
    const input = "Bob has a file in /home/bob";

    const output = applyEnvToString(input, {});

    expect(output).toBe("Bob has a file in /home/bob");
  });

  test("escape variable pattern that starts with a back slash", () => {
    const cases: ReplaceEnvTestCase[] = [
      {
        input: "I don't want to replace \\${THIS}",
        env: {
          THIS: "NO!!",
        },
        expected: "I don't want to replace \\${THIS}",
      },
      {
        input: "I don't want to replace \\$THIS",
        env: {
          THIS: "NO!!",
        },
        expected: "I don't want to replace \\$THIS",
      },
    ];

    for (const c of cases) {
      expect(applyEnvToString(c.input, c.env)).toBe(c.expected);
    }
  });

  test("unsupported variable name will not get replaced", () => {
    const cases = [
      {
        input: "I don't want to replace ${THIS!}",
        env: {
          "THIS!": "NO!!!",
        },
      },
      {
        input: "I don't want to replace ${THIS-}",
        env: {
          "THIS-": "NO!!!",
        },
      },
      {
        input: "I don't want to replace ${-THIS}",
        env: {
          "-THIS": "NO!!!",
        },
      },
      {
        input: "I don't want to replace ${THIS",
        env: {
          "{THIS": "NO!!!",
        },
      },
      {
        input: "I don't want to replace ${}",
        env: {
          "": "NO!!!",
        },
      },
    ];

    for (const c of cases) {
      expect(applyEnvToString(c.input, c.env)).toBe(c.input);
    }
  });
});

type ExtractEnvTestCase = {
  input: string;
  expected: string[];
};

describe("test extractEnvNames", () => {
  test("extracts multiple env names", () => {
    const cases: ExtractEnvTestCase[] = [
      {
        input: "${WHO} has a file in ${ROOT}/${PATH}",
        expected: ["WHO", "ROOT", "PATH"],
      },
      {
        input: "$WHO has a file in $ROOT/$PATH",
        expected: ["WHO", "ROOT", "PATH"],
      },
      {
        input: "I need $B",
        expected: ["B"],
      },
    ];

    for (const c of cases) {
      expect(extractEnvNames(c.input)).toEqual(c.expected);
    }
  });
});

describe("test layeredEnv", () => {
  test("returns empty record with 0 input", () => {
    expect(layeredEnv()).toEqual({});
  });

  test("returns overrided env with multiple input", () => {
    const output = layeredEnv(
      { A: "3" },
      { A: "2", B: "2" },
      { A: "1", B: "1", C: "1" }
    );

    expect(output).toEqual({ A: "3", B: "2", C: "1" });
  });

  test("returns overrided env with multiple input including empty", () => {
    const output = layeredEnv(
      {},
      { A: "3" },
      {},
      { A: "2", B: "2" },
      {},
      { A: "1", B: "1", C: "1" },
      {}
    );

    expect(output).toEqual({ A: "3", B: "2", C: "1" });
  });
});

describe("test expandEnv", () => {
  test("expands empty env", () => {
    expect(expandEnv({})).toEqual({});
  });

  test("expands env without reference", () => {
    const env: Env = {
      A: "Hello",
      B: "World",
    };

    expect(expandEnv(env)).toEqual(env);
  });

  test("expands env with internal reference", () => {
    const env: Env = {
      A: "I need $B",
      B: "$C, ${D}",
      C: "${D}",
      D: "D",
    };

    const expected: Env = {
      A: "I need D, D",
      B: "D, D",
      C: "D",
      D: "D",
    };

    expect(expandEnv(env)).toEqual(expected);
  });

  test("expands env with internal and external reference", () => {
    const env: Env = {
      A: "I need $B",
      B: "$C, ${D}",
      C: "${D}",
      D: "$E",
    };

    const baseEnv: Env = {
      E: "E",
    };

    const expected: Env = {
      A: "I need E, E",
      B: "E, E",
      C: "E",
      D: "E",
    };

    expect(expandEnv(env, baseEnv)).toEqual(expected);
  });

  test("expands env with undefined reference using ignoring", () => {
    const env: Env = {
      A: "I need $B",
      B: "$C, ${D}",
      C: "${D}",
      D: "$E",
    };

    const baseEnv: Env = {};

    const expected: Env = {
      A: "I need $E, $E",
      B: "$E, $E",
      C: "$E",
      D: "$E",
    };

    expect(
      expandEnv(env, baseEnv, { replaceUndefinedEnvWith: ReplaceOption.Ignore })
    ).toEqual(expected);
  });

  test("expands env with undefined reference using emtpy string", () => {
    const env: Env = {
      A: "I need $B",
      B: "$C, ${D}",
      C: "${D}",
      D: "$E",
    };

    const baseEnv: Env = {};

    const expected: Env = {
      A: "I need , ",
      B: ", ",
      C: "",
      D: "",
    };

    expect(expandEnv(env, baseEnv)).toEqual(expected);
  });

  test("expands env with self reference throws error", () => {
    expect(() => expandEnv({ A: "Hello, $A" })).toThrow(Error);
  });

  test("expands env with cyclic dependency throws error", () => {
    const env: Env = {
      A: "needs ${B}",
      B: "needs ${D}",
      C: "i'm fine",
      D: "needs ${A}",
    };
    expect(() => expandEnv(env)).toThrow(Error);
  });
});
