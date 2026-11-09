import { store } from "../main.js";
import { embed, roleIcon, matchesSearch } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import SearchBar from "../components/SearchBar.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

export default {
    components: { Spinner, SearchBar, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container">
                <SearchBar v-model="searchQuery" :dark="store.dark" label="Search levels" placeholder="Search levels"></SearchBar>
                <div class="list-content" ref="listContent">
                    <table class="list" v-if="list">
                        <tr v-for="item in filteredList" :key="item.index">
                            <td class="rank">
                                <p v-if="item.index + 1 <= 150" class="type-label-lg">#{{ item.index + 1 }}</p>
                                <p v-else class="type-label-lg">Legacy</p>
                            </td>
                            <td class="level" :class="{ 'active': selected == item.index, 'error': !item.level }">
                                <button @click="selected = item.index">
                                    <span class="type-label-lg">{{ item.level?.name || \`Error (\${item.err}.json)\` }}</span>
                                </button>
                            </td>
                        </tr>
                    </table>
                    <p class="search-empty" role="status" v-if="list && searchQuery.trim() && filteredList.length === 0">No levels found for "{{ searchQuery.trim() }}"</p>
                </div>
            </div>
            <div class="level-container">
                <div class="level-content">
                    <div class="level" v-if="level">
                        <h1>{{ level.name }}</h1>
                        <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>

                        <div class="packs" v-if="level.packs && level.packs.length > 0">
                            <div
                                v-for="pack in level.packs"
                                class="tag"
                                :style="{ background: pack.colour }"
                            >
                                <p>{{ pack.name }}</p>
                            </div>
                        </div>

                        <iframe class="video" id="videoframe" :src="video" title="Level verification video" allowfullscreen></iframe>
                        <ul class="stats">
                            <li>
                                <div class="type-title-sm">Points when completed</div>
                                <p>{{ score(selected + 1, 100, level.percentToQualify) }}</p>
                            </li>
                            <li>
                                <div class="type-title-sm">ID</div>
                                <p>{{ level.id }}</p>
                            </li>
                            <li>
                                <div class="type-title-sm">Password</div>
                                <p>{{ level.password || 'Free to Copy' }}</p>
                            </li>
                        </ul>
                        <h2>Records</h2>
                        <p v-if="selected + 1 <= 75"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                        <p v-else-if="selected +1 <= 150"><strong>100%</strong> or better to qualify</p>
                        <p v-else>This level does not accept new records.</p>
                        <table class="records">
                            <tr v-for="(record, r) in level.records" :key="r" class="record">
                                <td class="percent">
                                    <p>{{ record.percent }}%</p>
                                </td>
                                <td class="user">
                                    <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
                                </td>
                                <td class="mobile">
                                    <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                                </td>
                            </tr>
                        </table>
                    </div>
                    <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                        <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                    </div>
                </div>
            </div>
            <div class="meta-container">
                <div class="meta-content">
                    <div class="meta">
                        <div class="errors" v-show="errors.length > 0">
                            <p class="error" v-for="error of errors" :key="error">{{ error }}</p>
                        </div>
                        <div class="og">
                            <p class="type-label-md">Website layout made by <a href="https://2plist.github.io/2plist/#/" target="_blank">2 Player Levels List</a></p>
                        </div>
                        <template v-if="editors">
                            <h3>List Editors</h3>
                            <ol class="editors">
                                <li v-for="editor in editors" :key="editor.name">
                                    <img :src="roleIcon(editor.role, store.dark)" :alt="editor.role">
                                    <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                    <p v-else>{{ editor.name }}</p>
                                </li>
                            </ol>
                        </template>
                        <h3>Tags</h3>
                        <div class="tag-filters">
                            <button
                                type="button"
                                class="director"
                                :aria-pressed="searchQuery.trim() === '❌'"
                                @click="search('❌')"
                            >❌ Pending Removal</button>

                            <button
                                type="button"
                                class="director"
                                :aria-pressed="searchQuery.trim() === '🔥'"
                                @click="search('🔥')"
                            >🔥 Trending Levels</button>

                            <button
                                type="button"
                                class="director"
                                :aria-pressed="searchQuery.trim() === '📚'"
                                @click="search('📚')"
                            >📚 Desperate for Opinions</button>

                            <button
                                type="button"
                                class="director"
                                :aria-pressed="searchQuery.trim() === '👻'"
                                @click="search('👻')"
                            >👻 Banished. Just Banished.</button>
                        </div>
                        <h3>Submission Requirements</h3>
                        <p>
                            Achieved the record without using hacks (however, FPS bypass is allowed, up to 360fps)
                        </p>
                        <p>
                            Achieved the record on the level that is listed on the site - please check the level ID before you submit a record
                        </p>
                        <p>
                            Submit Records in the Discord Server
                        </p>
                        <p>
                            Once a level falls onto the Legacy List, we accept records for it for 24 hours after it falls off, then afterwards we never accept records for said level
                        </p>
                    </div>
                </div>
            </div>
        </main>
    `,

    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selected: 0,
        searchQuery: "",
        errors: [],
        toggledShowcase: false, // change to true to embed a level's showcase instead of its verification
        store
    }),

    computed: {
        filteredList() {
            if (!this.list) {
                return [];
            }
            return this.list
                .map(([level, err], index) => ({ level, err, index }))
                .filter(({ level, err }) =>
                    matchesSearch(this.searchQuery, level ? level.name : err, level?.id)
                );
        },
        level() {
            // null while loading, or if the list (or this level) failed to load
            return this.list?.[this.selected]?.[0] ?? null;
        },
        video() {
            if (!this.level) {
                return "";
            }

            if (!this.level.showcase) {
                return embed(this.level.verification);
            }

            return embed(
                this.toggledShowcase
                    ? this.level.showcase
                    : this.level.verification
            );
        },
    },

    watch: {
        searchQuery() {
            if (this.$refs.listContent) {
                this.$refs.listContent.scrollTop = 0;
            }
        },
    },

    async mounted() {
        this.list = await fetchList();
        this.editors = await fetchEditors();

        // Error handling
        if (!this.list) {
            this.errors = [
                "Failed to load list. Retry in a few minutes or notify list staff.",
            ];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => {
                        return `Failed to load level. (${err}.json)`;
                    })
            );
            if (!this.editors) {
                this.errors.push("Failed to load list editors.");
            }
        }

        // Hide loading spinner
        this.loading = false;
    },

    methods: {
        embed,
        score,
        roleIcon,

        search(emoji) {
            if (this.searchQuery.trim() === emoji) {
                this.searchQuery = "";
            } else {
                this.searchQuery = emoji;
            }
        },
    },
};