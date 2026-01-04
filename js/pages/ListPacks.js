import { fetchPacks, fetchPackLevels } from "../content.js";
import { getFontColour, embed } from "../util.js";
import { score } from "../score.js";
import { store } from "../main.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

export default {
    components: {
        Spinner,
        LevelAuthors,
    },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="pack-list">

        <div v-if="errors.length" class="surface" style="padding:12px; margin:12px; grid-column: 1 / -1;">
            <p class="error" v-for="e in errors">{{ e }}</p>
        </div>

        <div v-else-if="!packs || packs.length === 0" class="surface" style="padding:12px; margin:12px; grid-column: 1 / -1;">
            No packs available.
        </div>

        <template v-else>
        <div class="packs-nav">
            <div>
            <button
                @click="switchLevels(i)"
                v-for="(pack, i) in packs"
                class="type-label-lg"
                :style="{
                background: pack.colour,
                color: getFontColour(pack.colour)
                }"
            >
                <p>{{pack.name}}</p>
            </button>
            </div>
        </div>
            <div class="list-container">
                <table class="list" v-if="selectedPackLevels && selectedPackLevels.length">
                    <tr v-for="(level, i) in selectedPackLevels">
                        <td class="rank">
                            <p class="type-label-lg">#{{ i + 1 }}</p>
                        </td>
                        <td class="level" :class="{ 'active': selectedLevel == i, 'error': !level || !level[0] }">
                            <button :style="selectedLevel === i && pack ? { background: pack.colour } : {}" @click="selectedLevel = i">
                                <span class="type-label-lg">
                                    {{ (level && level[0] && level[0].level && level[0].level.name) ? level[0].level.name : ('Error (' + (level && level[1] ? level[1] : '?') + '.json)') }}
                                </span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="level-container">
                <div
                    class="level"
                    v-if="selectedPackLevels
                        && selectedPackLevels[selectedLevel]
                        && selectedPackLevels[selectedLevel][0]
                        && selectedPackLevels[selectedLevel][0].level"
                >
                    <h1>{{ selectedPackLevels[selectedLevel][0].level.name }}</h1>

                    <LevelAuthors
                    :author="selectedPackLevels[selectedLevel][0].level.author"
                    :creators="selectedPackLevels[selectedLevel][0].level.creators"
                    :verifier="selectedPackLevels[selectedLevel][0].level.verifier"
                    ></LevelAuthors>

                    <div class="level-packs">
                        <div
                            v-for="pack in selectedPackLevels[selectedLevel][0].level.packs"
                            class="tag"
                            :style="{ background: pack.colour, color: getFontColour(pack.colour) }"
                        >
                            {{ pack.name }}
                        </div>
                        </div>

                    <iframe
                    class="video"
                    :src="embed(selectedPackLevels[selectedLevel][0].level.verification)"
                    frameborder="0"
                    ></iframe>

                    <ul class="stats">
                    <li>
                        <div class="type-title-sm">ID</div>
                        <p>{{ selectedPackLevels[selectedLevel][0].level.id }}</p>
                    </li>
                    <li>
                        <div class="type-title-sm">Password</div>
                        <p>{{ selectedPackLevels[selectedLevel][0].level.password || 'Free to Copy' }}</p>
                    </li>
                    </ul>

                    <h2>Records</h2>
                    <p>
                    <strong>{{ selectedPackLevels[selectedLevel][0].level.percentToQualify }}%</strong>
                    or better to qualify
                    </p>

                    <table class="records">
                        <tr v-for="record in selectedPackLevels[selectedLevel][0].level.records" class="record">
                            <td class="percent"><p>{{ record.percent }}%</p></td>
                            <td class="user">
                            <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
                            </td>
                            <td class="mobile">
                            <img
                                v-if="record.mobile"
                                :src="'/assets/phone-landscape' + (store && store.dark ? '-dark' : '') + '.svg'"
                                alt="Mobile"
                            />
                            </td>
                            <td class="hz"><p>{{ record.hz }}Hz</p></td>
                        </tr>
                        </table>
            </div>

                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
                </div>
            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
                    <h3>About the packs</h3>
                    <p>
                        These are list packs all chosen by the staff team that you can beat levels for and get the packs attached to your profile
                    </p>
                    <h3>How can I get these packs?</h3>
                    <p>
                        It's as simple as just beating the levels and getting your records added! The packs will automatically appear on your profile when all levels have been completed
                    </p>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        packs: [],
        errors: [],
        selected: 0,
        selectedLevel: 0,
        selectedPackLevels: [],
        loading: true,
        loadingPack: true,
        store,
    }),
    computed: {
        pack() {
            return this.packs[this.selected];
        },
    },
    async mounted() {
  try {
    this.packs = await fetchPacks();

    if (!this.packs || this.packs.length === 0) {
      this.errors.push("No packs could be loaded (fetchPacks returned empty).");
      return;
    }

    const levels = await fetchPackLevels(this.packs[this.selected].name);

    if (!levels) {
      this.errors.push("Pack levels could not be loaded (fetchPackLevels returned null).");
      return;
    }

    this.selectedPackLevels = levels;
  } catch (e) {
    this.errors.push(`Packs page crashed: ${(e && e.message) ? e.message : e}`);
    console.error(e);
  } finally {
    this.loading = false;
  }
},

    methods: {
        async switchLevels(i) {
            this.loadingPack = true;

            this.selected = i;
            this.selectedLevel = 0;
            this.selectedPackLevels = await fetchPackLevels(
                this.packs[this.selected].name
            );

            this.loadingPack = false;
        },
        score,
        embed,
        getFontColour
    }
};