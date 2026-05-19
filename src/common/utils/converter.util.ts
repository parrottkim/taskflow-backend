export function convertToKoreanCurrency(amount) {
  const numberWords = [
    '',
    '일',
    '이',
    '삼',
    '사',
    '오',
    '육',
    '칠',
    '팔',
    '구',
  ];
  const smallUnits = ['', '십', '백', '천'];
  const bigUnits = ['', '만', '억', '조', '경'];

  // 숫자가 아니거나 음수인 경우 예외 처리
  const num = parseInt(amount, 10);
  if (isNaN(num) || num < 0) return '올바른 금액이 아닙니다.';
  if (num === 0) return '영 원';

  let result = '';
  let unitCount = 0;
  let currentNum = num;

  while (currentNum > 0) {
    // 4자리씩 끊어서 처리
    let chunk = currentNum % 10000;
    let chunkResult = '';

    for (let i = 0; i < 4; i++) {
      let digit = chunk % 10;
      if (digit > 0) {
        // '일십', '일백', '일천'에서 '일'을 생략하고 싶다면 아래 주석 해제
        // let word = (digit === 1 && i > 0) ? "" : numberWords[digit];
        let word = numberWords[digit];
        chunkResult = word + smallUnits[i] + chunkResult;
      }
      chunk = Math.floor(chunk / 10);
    }

    // 해당 4자리에 숫자가 하나라도 있으면 큰 단위(만, 억...)를 붙임
    if (chunkResult !== '') {
      result = chunkResult + bigUnits[unitCount] + ' ' + result;
    }

    currentNum = Math.floor(currentNum / 10000);
    unitCount++;
  }

  return result.trim() + ' 원';
}
