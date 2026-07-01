export function timeout(ms: number) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Tiempo de espera agotado"));
    }, ms);
  });
}