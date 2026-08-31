import { store } from "../main.js";
import { fetchEditors, fetchChangelog } from "../content.js";

import Spinner from "../components/Spinner.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    artist: "brush",
    trial: "user-lock",
};

export default {
    components: { Spinner },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-home">
            <div class="home-container">
                <div class="text-container">
                    <h1 v-html="welcomeText"></h1>
                    <hr class="divider">
                    <p>
                    This list keeps track of the hardest 2-player levels in Geometry Dash that have been done&nbsp;<strong>solo</strong>. Levels must have enough of its length&nbsp;<i>or</i> difficulty come from its 2P sections to place on the list. Keep in mind the list is an approximation based on players' opinions and is <strong>not objective</strong>.
                    </p>
                </div>
                <div class="changelog-container">
                    <template v-if="changelog && changelog.length">
                        <h2>Changelog <hr class="divider"></h2>
                        <ol class="changelog">
                            <li v-for="entry in paginatedChangelog" :key="entry.id">
                                <p class="type-label-md" v-html="formatEntryText(entry.date, entry.text)"></p>
                            </li>
                        </ol>
                       <div class="pagination">
                            <button class="btn" @click="firstPage" :disabled="currentPage === 1"><span class="type-label-lg"><<</span></button>
                            <button class="btn" @click="prevPage" :disabled="currentPage === 1"><span class="type-label-lg">Previous</span></button>
                            <button v-for="page in pageNumbers" :key="page" class="btn" @click="goToPage(page)" :class="{ active: currentPage === page }"><span class="type-label-lg">{{ page }}</span></button>
                            <input v-if="totalPages > 5" class="btn" type="number" v-model.number="inputPage" @keyup.enter="goToInputPage" min="1" :max="totalPages" placeholder="..." />
                            <button class="btn" @click="nextPage" :disabled="currentPage === totalPages"><span class="type-label-lg">Next</span></button>
                            <button class="btn" @click="lastPage" :disabled="currentPage === totalPages"><span class="type-label-lg">>></span></button>
                        </div>
                    </template>
                    <p v-else-if="errors.includes('Failed to load changelog.')" class="error">Failed to load changelog.</p>
                </div>
            </div>
            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
                    <template v-if="editors && editors.length">
                        <h2>Staff <hr class="divider"></h2>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="\`assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role" :title="editor.role" style="cursor: help;">
                                <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                <p v-else>{{ editor.name }}</p>
                            </li>
                        </ol>
                    </template>
                    <div class="og">
                        <p class="type-label-md">List Template by <a href="https://tsl.pages.dev/" target="_blank">The Shitty List</a></p>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        editors: [],
        changelog: [],
        loading: true,
        errors: [],
        roleIconMap,
        store,
        currentPage: 1,
        itemsPerPage: 8,
        welcomeText: '',
        inputPage: '',
    }),
    computed: {
        paginatedChangelog() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.changelog.slice(start, end);
        },
        totalPages() {
            return Math.ceil(this.changelog.length / this.itemsPerPage);
        },
        pageNumbers() {
            const pages = [];
            if (this.totalPages <= 5) {
                for (let i = 1; i <= this.totalPages; i++) {
                    pages.push(i);
                }
            } else if (this.currentPage <= 3) {
                pages.push(1, 2, 3, 4, 5);
            } else if (this.currentPage >= this.totalPages - 2) {
                pages.push(
                    this.totalPages - 4,
                    this.totalPages - 3,
                    this.totalPages - 2,
                    this.totalPages - 1,
                    this.totalPages
                );
            } else {
                pages.push(
                    this.currentPage - 2,
                    this.currentPage - 1,
                    this.currentPage,
                    this.currentPage + 1,
                    this.currentPage + 2
                );
            }
            return pages;
        },
    },
    async mounted() {
        this.welcomeText = this.getRandomText();

        const [editors, changelog] = await Promise.all([
            fetchEditors(),
            fetchChangelog(),
        ]);

        this.editors = editors ?? [];
        this.changelog = changelog ?? [];

        if (!editors) {
            this.errors.push("Failed to load staff.");
        }
        if (!changelog) {
            this.errors.push("Failed to load changelog.");
        }

        this.loading = false;
    },
    methods: {
        getRandomText() {
            const randomNumber = Math.floor(Math.random() * 200) + 1;
            return randomNumber === 1
                ? 'Welcome to <span class="gradient-text">your mind</span>...'
                : 'Welcome to the <span class="gradient-text">2P List</span>!';
        },
        nextPage() {
            if (this.currentPage < this.totalPages) this.currentPage++;
        },
        prevPage() {
            if (this.currentPage > 1) this.currentPage--;
        },
        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) this.currentPage = page;
        },
        goToInputPage() {
            const page = parseInt(this.inputPage, 10);
            if (!isNaN(page)) {
                if (page > this.totalPages) this.goToPage(this.totalPages);
                else if (page < 1) this.goToPage(1);
                else this.goToPage(page);
            }
            this.inputPage = '';
        },
        firstPage() {
            this.currentPage = 1;
        },
        lastPage() {
            this.currentPage = this.totalPages;
        },
        formatEntryText(date, text) {
            const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            return `${date} - ${formattedText}`;
        },
    },
};