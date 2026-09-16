export const now = new Date();

export const startOfToday = new Date(now);
startOfToday.setHours(0, 0, 0, 0);

export const startOfTomorrow = new Date(startOfToday);
startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

export const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
);

export const todayStart = Temporal.Instant.fromEpochMilliseconds(
    startOfToday.getTime()
);

export const tomorrowStart = Temporal.Instant.fromEpochMilliseconds(
    startOfTomorrow.getTime()
);

export const monthStart = Temporal.Instant.fromEpochMilliseconds(
    startOfMonth.getTime()
);