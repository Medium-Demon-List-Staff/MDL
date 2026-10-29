import { round, score } from './score.js';

/**
 * Path to directory containing `_list.json` and all levels
 */
const dir = '/data';

async function fetchJson(file) {
    try {
        const res = await fetch(`${dir}/${file}`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export async function fetchChangelog() {
    return fetchJson('_changelog.json'); // array of { date, text }
}

export async function fetchEditors() {
    return fetchJson('_editors.json');
}

let packsRequest = null;

export function fetchPacks() {
    packsRequest ??= fetchJson('_packlist.json').then((packs) => {
        if (!packs) packsRequest = null;
        return packs;
    }); // array of { name, levels, colour }
    return packsRequest;
}

export async function fetchList() {
    // Load pack definitions once
    const packs = await fetchPacks(); // null or array
    const levelToPacks = {};

    (packs ?? []).forEach((pack) => {
        (pack.levels ?? []).forEach((levelId) => {
            (levelToPacks[levelId] ??= []).push({
                name: pack.name,
                colour: pack.colour,
            });
        });
    });

    const list = await fetchJson('_list.json');
    if (!list) {
        console.error('Failed to load list.');
        return null;
    }

    return Promise.all(
        list.map(async (path, rank) => {
            const level = await fetchJson(`${path}.json`);
            if (!level) {
                console.error(`Failed to load level #${rank + 1} ${path}.`);
                return [null, path];
            }
            return [
                {
                    ...level,
                    path,
                    // Inject packs membership (empty array if none / packs failed)
                    packs: levelToPacks[path] ?? [],
                    records: (level.records ?? [])
                        .map(({ hz, ...rest }) => rest)
                        .sort((a, b) => b.percent - a.percent),
                },
                null,
            ];
        }),
    );
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
                    levelPath: level.path, // (file id)
                    score: score(rank + 1, 100, level.percentToQualify),
                    link: record.link,
                });
                return;
            }

            progressed.push({
                rank: rank + 1,
                level: level.name,
                levelPath: level.path,
                percent: record.percent,
                score: score(rank + 1, record.percent, level.percentToQualify),
                link: record.link,
            });
        });
    });

    // User & total score.
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

    const packs = await fetchPacks();

    res.forEach((player) => {
        if (!packs) return;

        // completed level file-ids (paths) from _list.json
        const completedIds = new Set(
            player.completed.map((l) => l.levelPath).filter(Boolean),
        );

        // Pack is "completed" only if EVERY levelId in that pack is completed
        player.packs = packs.filter((pack) => {
            const levels = pack.levels ?? [];
            if (levels.length === 0) return false; // ignore empty packs
            return levels.every((levelId) => completedIds.has(levelId));
        });
    });

    // Sort by total score
    return [res.sort((a, b) => b.total - a.total), errs];
}

export async function fetchPackLevels(packName) {
    const packs = await fetchPacks();
    const pack = packs?.find((p) => p.name === packName);
    if (!pack) return null;

    return Promise.all(
        pack.levels.map(async (path, idx) => {
            const level = await fetchJson(`${path}.json`);
            if (!level) {
                console.error(`Failed to load pack level #${idx + 1}: ${path}.json`);
                return [null, path];
            }
            return [{
                level: {
                    ...level,
                    path,
                    records: (level.records ?? [])
                        .map(({ hz, ...rest }) => rest)
                        .sort((a, b) => b.percent - a.percent),
                },
            }, null];
        }),
    );
}
