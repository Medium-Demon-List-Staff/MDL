import { round, score } from './score.js';

/**
 * Path to directory containing `_list.json` and all levels
 */
const dir = '/data';

export async function fetchList() {
    const listResult = await fetch(`${dir}/_list.json`);
    try {
        const list = await listResult.json();
        return await Promise.all(
            list.map(async (path, rank) => {
                const levelResult = await fetch(`${dir}/${path}.json`);
                try {
                    const level = await levelResult.json();
                    return [
                        {
                            ...level,
                            path,
                            records: level.records.sort(
                                (a, b) => b.percent - a.percent,
                            ),
                        },
                        null,
                    ];
                } catch {
                    console.error(`Failed to load level #${rank + 1} ${path}.`);
                    return [null, path];
                }
            }),
        );
    } catch {
        console.error(`Failed to load list.`);
        return null;
    }
}

export async function fetchEditors() {
    try {
        const editorsResults = await fetch(`${dir}/_editors.json`);
        const editors = await editorsResults.json();
        return editors;
    } catch {
        return null;
    }
}

export async function fetchLeaderboard() {
    const list = await fetchList();

    if (!list) {
        return null;
    }

    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }

        // Verification
        const verifier = Object.keys(scoreMap).find(
            (u) => u.toLowerCase() === level.verifier.toLowerCase(),
        ) || level.verifier;
        scoreMap[verifier] ??= {
            verified: [],
            completed: [],
            progressed: [],
        };
        const { verified } = scoreMap[verifier];
        verified.push({
            rank: rank + 1,
            level: level.name,
            score: score(rank + 1, 100, level.percentToQualify),
            link: level.verification,
        });

        // Records
        level.records.forEach((record) => {
            const user = Object.keys(scoreMap).find(
                (u) => u.toLowerCase() === record.user.toLowerCase(),
            ) || record.user;
            scoreMap[user] ??= {
                verified: [],
                completed: [],
                progressed: [],
            };
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                completed.push({
                    rank: rank + 1,
                    level: level.name,
                    levelPath: level.path,  // (file id)
                    score: score(rank + 1, 100, level.percentToQualify),
                    link: record.link,
                });
                return;
            }

            progressed.push({
                rank: rank + 1,
                level: level.name,
                percent: record.percent,
                score: score(rank + 1, record.percent, level.percentToQualify),
                link: record.link,
            });
        });
    });

    // Wrap in extra Object containing the user and total score
const res = Object.entries(scoreMap).map(([user, scores]) => {
    const { verified, completed, progressed } = scores;
    const total = [verified, completed, progressed]
        .flat()
        .reduce((prev, cur) => prev + cur.score, 0);

    return {
        user,
        total: round(total),
        packs: [],
        ...scores,
    };
});

/* ================= PACK COMPLETION ================= */

const packs = await fetchPacks(); // uses _packlist.json

if (packs) {
    // Build map: levelId -> [packObjects...]
    const levelToPacks = {};
    packs.forEach(pack => {
        (pack.levels ?? []).forEach(levelId => {
            (levelToPacks[levelId] ??= []).push(pack);
        });
    });

    res.forEach(player => {
        // Use file IDs only (matches _packlist.json)
        const completedIds = new Set(
            player.completed.map(l => l.levelPath).filter(Boolean)
        );

        // Count how many completed levels per pack
        const counts = new Map();
        completedIds.forEach(levelId => {
            (levelToPacks[levelId] ?? []).forEach(pack => {
                counts.set(pack.name, (counts.get(pack.name) ?? 0) + 1);
            });
        });

        // Keep your ">= 3" rule
        player.packs = packs.filter(pack => (counts.get(pack.name) ?? 0) >= 3);
    });
} else {
    res.forEach(player => (player.packs = []));
}


/* =================================================== */

// Sort by total score
return [res.sort((a, b) => b.total - a.total), errs];
}

export async function fetchPacks() {
    try {
        const res = await fetch(`${dir}/_packlist.json`);
        return await res.json();
    } catch {
        return null;
    }
}

export async function fetchPacks() {
    try {
        const res = await fetch(`${dir}/_packlist.json`);
        return await res.json(); // array of {name, levels, colour}
    } catch {
        return null;
    }
}

export async function fetchPackLevels(packName) {
    try {
        const packs = await fetchPacks();
        if (!packs) return null;

        const pack = packs.find(p => p.name === packName);
        if (!pack) return null;

        // Fetch each level JSON listed in pack.levels
        return await Promise.all(
            pack.levels.map(async (path, idx) => {
                try {
                    const levelRes = await fetch(`${dir}/${path}.json`);
                    const level = await levelRes.json();

                    // Match the shape your ListPacks template expects:
                    // selectedPackLevels[i][0].level.<field>
                    return [{
                        level: {
                            ...level,
                            path,
                            records: (level.records ?? []).sort((a, b) => b.percent - a.percent),
                        }
                    }, null];
                } catch {
                    console.error(`Failed to load pack level #${idx + 1}: ${path}.json`);
                    return [null, path];
                }
            })
        );
    } catch {
        return null;
    }
}