export function convertTimezone(date: string, time: string, fromTimezone: string): Date {
    const localDate = new Date(`${date}T${time}Z`)

    // 타임존 오프셋을 계산하기 위한 옵션 설정
    const options: Intl.DateTimeFormatOptions = {
        timeZone: fromTimezone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
    }

    // 입력된 타임존의 현재 시간과 UTC 시간의 차이를 계산
    const formatter = new Intl.DateTimeFormat([], options)
    const timeParts = formatter.formatToParts(localDate)

    // 입력된 타임존의 UTC 오프셋 계산
    const hour = parseInt(timeParts.find((part) => part.type === 'hour').value)
    const isDST = timeParts.some((part) => part.type === 'dayPeriod') // 여름 시간제 확인
    const utcOffset = hour + (isDST ? -1 : 0) - localDate.getUTCHours() // UTC 오프셋 계산

    return new Date(localDate.getTime() - utcOffset * 60 * 60 * 1000)
}

export function convertUTCToTimezone(utcDate: Date, toTimezone: string): string {
    // UTC Date 객체를 문자열로 변환
    const options: Intl.DateTimeFormatOptions = {
        timeZone: toTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }

    // UTC 시간을 포맷팅하여 해당 타임존으로 변환
    const formatter = new Intl.DateTimeFormat([], options)
    const timeParts = formatter.formatToParts(utcDate)

    // 변환된 시간 조합
    const year = timeParts.find((part) => part.type === 'year').value
    const month = timeParts.find((part) => part.type === 'month').value
    const day = timeParts.find((part) => part.type === 'day').value
    const hour = timeParts.find((part) => part.type === 'hour').value
    const minute = timeParts.find((part) => part.type === 'minute').value
    const second = timeParts.find((part) => part.type === 'second').value

    // 변환된 날짜와 시간 문자열 생성
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

export function getNowUTCTime() {
    const now = new Date() // 현재 로컬 시간
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()))
}
