import circom_tester from "circom_tester";
import * as path from "path";
import { readFileSync } from "fs";
import apis from "../../apis/pkg";

const wasm_tester = circom_tester.wasm;

jest.setTimeout(120000);

describe("CommandRegex", () => {
    let circuit;

    beforeAll(async () => {
        circuit = await wasm_tester(
            path.join(__dirname, "./circuits/test_command_regex.circom"),
            {
                include: path.join(__dirname, "../../../node_modules"),
            }
        );
    });

    const createMask = (input, totalLength = 60) => {
        const mask = new Array(totalLength).fill(0);
        const prefix = '<div dir="ltr">';
        const suffix = '</div>';
        
        if (input.startsWith(prefix) && input.endsWith(suffix)) {
            const content = input.slice(prefix.length, -suffix.length);
            for (let i = 0; i < content.length; i++) {
                mask[i + prefix.length] = content.charCodeAt(i);
            }
        }
        
        return mask;
    };

    const testCase = async (input, expectedOutput, expectedReveal) => {
        const paddedStr = apis.padString(input, 60);
        const circuitInputs = {
            msg: paddedStr,
        };

        const witness = await circuit.calculateWitness(circuitInputs);
        await circuit.checkConstraints(witness);

        await circuit.assertOut(witness, {
            out: expectedOutput,
        });

        await circuit.assertOut(witness, {
            reveal0: expectedReveal,
        });
    };

    it("should match a valid command", async () => {
        const input = '<div dir="ltr">Hello, World!</div>';
        await testCase(
            input,
            1,
            createMask(input)
        );
    });

    it("should not match an invalid command", async () => {
        const input = "<span>This is not a valid command</span>";
        await testCase(input, 0, createMask(input));
    });

    it("should not match a command with multiple attributes", async () => {
        const input = '<div dir="ltr" class="command">Execute this</div>';
        await testCase(input, 0, createMask(input));
    });

    it("should match a command with nested content", async () => {
        const input = '<div dir="ltr">Run <strong>this</strong> command</div>';
        await testCase(
            input,
            1,
            createMask(input)
        );
    });

    it("should not match when dir attribute is missing", async () => {
        const input = "<div>This is not a valid command</div>";
        await testCase(input, 0, createMask(input));
    });
});
