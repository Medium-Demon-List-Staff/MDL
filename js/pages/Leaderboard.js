import { fetchLeaderboard } from "../content.js";
import { localize, getFontColour, matchesSearch } from "../util.js";
import { store } from "../main.js";

import Spinner from "../components/Spinner.js";
import SearchBar from "../components/SearchBar.js";

export default {
    components: {
        Spinner,
        SearchBar,
    },
    data: () => ({
        leaderboard: [],
        loading: true,
        failed: false,
        selected: 0,
        searchQuery: "",
        store,
        // Small screens only.
        boardOpen: false,
        err: [],
    }),
    template: `
        <main v-if="loading" class="surface">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-leaderboard-container">
            <div class="page-leaderboard" :class="{ 'board-open': boardOpen }">
                <div class="error-container" v-if="failed || err.length > 0">
                    <p class="error" v-if="failed">
                        Failed to load the leaderboard. Retry in a few minutes or notify list staff.
                    </p>
                    <p class="error" v-else>
                        Leaderboard may be incorrect, as the following levels could not be loaded: {{ err.join(', ') }}
                    </p>
                </div>
                
                <SearchBar
                    v-if="!failed"
                    class="search-bar--boxed"
                    :modelValue="searchQuery"
                    @update:modelValue="onSearch"
                    :dark="store.dark"
                    label="Search players"
                    placeholder="Search players"
                ></SearchBar>

                <button
                    v-if="entry"
                    type="button"
                    class="board-toggle"
                    aria-controls="leaderboard-list"
                    :aria-expanded="boardOpen ? 'true' : 'false'"
                    @click="toggleBoard"
                >
                    <span class="board-toggle__label type-label-lg">#{{ selected + 1 }} {{ entry.user }}</span>
                    <span class="board-toggle__total type-label-lg">{{ localize(entry.total) }}</span>
                    <span class="board-toggle__chevron" aria-hidden="true"></span>
                </button>

                <div id="leaderboard-list" class="board-container surface">
                    <SearchBar
                        v-if="!failed"
                        class="search-bar--panel"
                        :modelValue="searchQuery"
                        @update:modelValue="onSearch"
                        :dark="store.dark"
                        label="Search players"
                        placeholder="Search players"
                    ></SearchBar>
                    <div class="board-content" ref="boardContent">
                        <table class="board">
                            <tr v-for="item in filteredBoard" :key="item.player.user">
                                <td class="rank">
                                    <p class="type-label-lg">#{{ item.index + 1 }}</p>
                                </td>
                                <td class="total">
                                    <p class="type-label-lg">{{ localize(item.player.total) }}</p>
                                </td>
                                <td class="user" :class="{ 'active': selected == item.index }">
                                    <button type="button" @click="selectPlayer(item.index)">
                                        <span class="type-label-lg">{{ item.player.user }}</span>
                                    </button>
                                </td>
                            </tr>
                        </table>
                        <p class="search-empty" role="status" v-if="searchQuery.trim() && filteredBoard.length === 0">No players found for "{{ searchQuery.trim() }}"</p>
                    </div>
                </div>
                <div class="player-container surface">
                    <div class="player-content">
                    
                        <div class="player" v-if="entry">
                            <h1>#{{ selected + 1 }} {{ entry.user }}</h1>
                            <h3>{{ entry.total }}</h3>

                            <h2 v-if="entry.packs?.length">Packs</h2>
                            <div v-if="entry.packs?.length" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;">
                                <div v-for="pack in entry.packs"
                                    :key="pack.name"
                                    class="tag"
                                    :style="{
                                        background: pack.colour,
                                        color: getFontColour(pack.colour),
                                        padding: '8px 12px',
                                        borderRadius: '14px',
                                        lineHeight: '1.1'
                                    }">
                                    {{ pack.name }}
                                </div>
                            </div>

                            <h2 v-if="entry.verified.length > 0">Verified ({{ entry.verified.length}})</h2>
                            <table v-if="entry.verified.length > 0" class="table">
                                <tr v-for="score in entry.verified">
                                    <td class="rank"><p>#{{ score.rank }}</p></td>
                                    <td class="level"><a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a></td>
                                    <td class="score"><p>+{{ localize(score.score) }}</p></td>
                                </tr>
                            </table>
                            <h2 v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                            <table v-if="entry.completed.length > 0" class="table">
                                <tr v-for="score in entry.completed">
                                    <td class="rank"><p>#{{ score.rank }}</p></td>
                                    <td class="level"><a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a></td>
                                    <td class="score"><p>+{{ localize(score.score) }}</p></td>
                                </tr>
                            </table>
                            <h2 v-if="entry.progressed.length > 0">Progressed ({{entry.progressed.length}})</h2>
                            <table v-if="entry.progressed.length > 0" class="table">
                                <tr v-for="score in entry.progressed">
                                    <td class="rank"><p>#{{ score.rank }}</p></td>
                                    <td class="level"><a class="type-label-lg" target="_blank" :href="score.link">{{ score.percent }}% {{ score.level }}</a></td>
                                    <td class="score"><p>+{{ localize(score.score) }}</p></td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    `,
    computed: {
        entry() {
            return this.leaderboard[this.selected];
        },

        filteredBoard() {
            return this.leaderboard
                .map((player, index) => ({ player, index }))
                .filter(({ player }) => matchesSearch(this.searchQuery, player.user));
        },
    },

    watch: {
        searchQuery() {
            if (this.$refs.boardContent) {
                this.$refs.boardContent.scrollTop = 0;
            }
        },
    },

    async mounted() {
        const result = await fetchLeaderboard();

        if (!result) {
            this.failed = true;
            this.loading = false;
            return;
        }

        const [leaderboard, err] = result;
        this.leaderboard = leaderboard;
        this.err = err;
        this.loading = false;
    },

    methods: {
        localize,
        getFontColour,
        /** Small screens: open / close the ranking dropdown. */
        toggleBoard() {
            this.boardOpen = !this.boardOpen;
            if (!this.boardOpen) return;

            this.$nextTick(() => {
                const list = document.querySelector(".board-content");
                const active = list && list.querySelector(".user.active");
                if (active) list.scrollTop = active.offsetTop - list.clientHeight / 2;
            });
        },

        onSearch(value) {
            this.searchQuery = value;
            if (value.trim()) this.boardOpen = true;
        },

        selectPlayer(i) {
            this.selected = i;
            this.boardOpen = false;
            if (!window.matchMedia("(min-width: 1025px)").matches) {
                this.searchQuery = "";
            }

            window.scrollTo({ top: 0 });
        },
    },
};
