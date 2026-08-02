import { describe, expect, it } from "vitest";
import {
  ACTIVITIES,
  DAILY_CAP,
  currentStreak,
  dayKey,
  daysBetween,
  daysInactive,
  distinctDays,
  evaluateCheckin,
  inactivityThreshold,
  isOnPace,
  remainingToday,
  requiredPace,
  seasonDay,
  seasonEndsOn,
  seasonIsOver,
  shieldToSpend,
  shiftDay,
  totalPoints,
  type Season,
} from "./rules";

/** A temporada de teste que o Sam vai rodar primeiro. */
const semana: Season = {
  startsOn: "2026-08-03",
  totalDays: 7,
  goalDays: 5,
  shields: 1,
};

describe("datas", () => {
  it("usa o fuso de São Paulo, não o do servidor", () => {
    // 03/08 às 02:00 UTC ainda é dia 02 em São Paulo (UTC-3).
    expect(dayKey(new Date("2026-08-03T02:00:00Z"))).toBe("2026-08-02");
    expect(dayKey(new Date("2026-08-03T05:00:00Z"))).toBe("2026-08-03");
  });

  it("anda para frente e para trás atravessando o mês", () => {
    expect(shiftDay("2026-08-31", 1)).toBe("2026-09-01");
    expect(shiftDay("2026-09-01", -1)).toBe("2026-08-31");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("conta a diferença em dias", () => {
    expect(daysBetween("2026-08-03", "2026-08-09")).toBe(6);
    expect(daysBetween("2026-08-09", "2026-08-03")).toBe(-6);
    expect(daysBetween("2026-08-03", "2026-08-03")).toBe(0);
  });
});

describe("temporada", () => {
  it("o primeiro dia é o dia 1", () => {
    expect(seasonDay(semana, "2026-08-03")).toBe(1);
    expect(seasonDay(semana, "2026-08-06")).toBe(4);
    expect(seasonDay(semana, "2026-08-09")).toBe(7);
  });

  it("termina no sétimo dia, não no oitavo", () => {
    expect(seasonEndsOn(semana)).toBe("2026-08-09");
    expect(seasonIsOver(semana, "2026-08-09")).toBe(false);
    expect(seasonIsOver(semana, "2026-08-10")).toBe(true);
  });

  it("exige o ritmo proporcional da meta", () => {
    // meta de 5 dias em 7
    expect(requiredPace(semana, "2026-08-03")).toBe(1); // dia 1
    expect(requiredPace(semana, "2026-08-06")).toBe(3); // dia 4
    expect(requiredPace(semana, "2026-08-09")).toBe(5); // dia 7
  });

  it("não passa da meta depois que a temporada acaba", () => {
    expect(requiredPace(semana, "2026-08-20")).toBe(semana.goalDays);
  });

  it("no dia 4, quem tem 3 dias está no ritmo e quem tem 2 não está", () => {
    expect(isOnPace(3, semana, "2026-08-06")).toBe(true);
    expect(isOnPace(2, semana, "2026-08-06")).toBe(false);
  });

  it("aperta o alerta de sumido em temporada curta", () => {
    expect(inactivityThreshold(semana)).toBe(2);
    expect(inactivityThreshold({ ...semana, totalDays: 30 })).toBe(3);
  });
});

describe("sequência", () => {
  it("conta dias consecutivos até hoje", () => {
    expect(
      currentStreak({
        checkinDays: ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06"],
        today: "2026-08-06",
      }),
    ).toBe(4);
  });

  it("não quebra só porque o aluno ainda não marcou hoje", () => {
    // São 9h da manhã. Ele marcou ontem e anteontem. A sequência está viva.
    expect(
      currentStreak({
        checkinDays: ["2026-08-04", "2026-08-05"],
        today: "2026-08-06",
      }),
    ).toBe(2);
  });

  it("quebra quando o buraco é de ontem e anteontem", () => {
    expect(
      currentStreak({
        checkinDays: ["2026-08-03"],
        today: "2026-08-06",
      }),
    ).toBe(0);
  });

  it("atravessa o buraco coberto por protetor", () => {
    expect(
      currentStreak({
        checkinDays: ["2026-08-03", "2026-08-04", "2026-08-06"],
        shieldedDays: ["2026-08-05"],
        today: "2026-08-06",
      }),
    ).toBe(4);
  });

  it("é zero para quem nunca marcou nada", () => {
    expect(currentStreak({ checkinDays: [], today: "2026-08-06" })).toBe(0);
  });
});

describe("protetor de sequência", () => {
  const base = { season: semana, today: "2026-08-06" };

  it("gasta no dia que ficou vazio no meio da sequência", () => {
    expect(
      shieldToSpend({
        ...base,
        checkinDays: ["2026-08-03", "2026-08-04"],
        shieldedDays: [],
      }),
    ).toBe("2026-08-05");
  });

  it("não gasta se ontem já teve check-in", () => {
    expect(
      shieldToSpend({
        ...base,
        checkinDays: ["2026-08-04", "2026-08-05"],
        shieldedDays: [],
      }),
    ).toBeNull();
  });

  it("não gasta o segundo quando a temporada só dá um", () => {
    expect(
      shieldToSpend({
        ...base,
        checkinDays: ["2026-08-03"],
        shieldedDays: ["2026-08-04"],
      }),
    ).toBeNull();
  });

  it("não salva quem não tinha sequência viva para salvar", () => {
    // Nunca marcou nada: não há o que proteger.
    expect(
      shieldToSpend({ ...base, checkinDays: [], shieldedDays: [] }),
    ).toBeNull();
  });

  it("não gasta protetor em dia anterior à temporada", () => {
    expect(
      shieldToSpend({
        season: semana,
        today: "2026-08-03",
        checkinDays: ["2026-08-01"],
        shieldedDays: [],
      }),
    ).toBeNull();
  });
});

describe("check-in", () => {
  const base = { season: semana, today: "2026-08-06" };

  it("devolve os pontos da atividade", () => {
    expect(evaluateCheckin({ ...base, activityId: "aula", checkinsToday: 0 })).toEqual({
      ok: true,
      points: 10,
    });
    expect(evaluateCheckin({ ...base, activityId: "musica", checkinsToday: 2 })).toEqual({
      ok: true,
      points: 2,
    });
  });

  it("barra no teto diário", () => {
    expect(evaluateCheckin({ ...base, activityId: "musica", checkinsToday: DAILY_CAP })).toEqual({
      ok: false,
      reason: "teto-diario",
    });
  });

  it("barra atividade que não existe", () => {
    expect(evaluateCheckin({ ...base, activityId: "tiktok", checkinsToday: 0 })).toEqual({
      ok: false,
      reason: "atividade-invalida",
    });
  });

  it("barra fora da temporada", () => {
    expect(
      evaluateCheckin({ ...base, today: "2026-08-15", activityId: "aula", checkinsToday: 0 }),
    ).toEqual({ ok: false, reason: "fora-da-temporada" });
  });

  it("falar vale mais que ouvir música", () => {
    const fala = ACTIVITIES.find((a) => a.id === "fala")!.points;
    const musica = ACTIVITIES.find((a) => a.id === "musica")!.points;
    expect(fala).toBeGreaterThan(musica);
  });

  it("conta o que ainda cabe hoje", () => {
    expect(remainingToday(0)).toBe(3);
    expect(remainingToday(2)).toBe(1);
    expect(remainingToday(5)).toBe(0);
  });
});

describe("agregados", () => {
  const checkins = [
    { day: "2026-08-03", activityId: "aula", points: 10 },
    { day: "2026-08-03", activityId: "musica", points: 2 },
    { day: "2026-08-05", activityId: "fala", points: 8 },
  ];

  it("soma os pontos congelados, não os atuais", () => {
    expect(totalPoints(checkins)).toBe(20);
  });

  it("conta dias distintos, não check-ins", () => {
    expect(distinctDays(checkins)).toBe(2);
  });

  it("mede quantos dias o aluno está sumido", () => {
    expect(daysInactive("2026-08-06", "2026-08-06")).toBe(0);
    expect(daysInactive("2026-08-04", "2026-08-06")).toBe(2);
    expect(daysInactive(null, "2026-08-06")).toBe(Number.POSITIVE_INFINITY);
  });
});
