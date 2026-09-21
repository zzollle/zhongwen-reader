/**
 * 수업 코드. 앱을 잠그는 용도가 아니라, 학습 기록에서 수강생과 외부 이용자를
 * 구분하는 표시로만 쓴다. 앱은 누구에게나 열려 있다.
 */
export function classCode(): string | null {
  const code = process.env.CLASS_CODE;
  return code && code.trim() ? code.trim() : null;
}
