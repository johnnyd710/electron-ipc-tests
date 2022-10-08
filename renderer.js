import { toMainTest, toUtilityTest } from "./tests.js";

document.getElementById("StartTests").addEventListener("click", startTests);

function setVal(id, value) {
    document.getElementById(id).innerHTML = value;
}

async function startTests() {
    await utilityTests();
    await mainTests();
}

async function utilityTests() {
    const iterations = +(document.getElementById("iterations").value);
    const start = performance.now();
    const measurements = await toUtilityTest(iterations);
    const average = (Array.from(measurements.values())
        .reduce((prev, curr) => prev + curr, 0))
        / measurements.size;
    const wholeAverage = (performance.now() - start) / iterations;
    setVal("resultsUtilAvg", average)
    setVal("resultsUtilWholeAvg", wholeAverage)
}

async function mainTests() {
    const iterations = +(document.getElementById("iterations").value);
    const start = performance.now();
    const measurements = await toMainTest(iterations);
    const average = (Array.from(measurements.values())
        .reduce((prev, curr) => prev + curr, 0))
        / measurements.size;
    const wholeAverage = (performance.now() - start) / iterations;
    setVal("resultsMainAvg", average)
    setVal("resultsMainWholeAvg", wholeAverage)
}
