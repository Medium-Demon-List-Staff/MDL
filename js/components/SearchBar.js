export default {
    props: {
        modelValue: { type: String, default: "" },
        label: { type: String, default: "Search" },
        placeholder: { type: String, default: "Search" },
        dark: { type: Boolean, default: false },
    },
    emits: ["update:modelValue"],
    computed: {
        icon() {
            return "/assets/search" + (this.dark ? "-dark" : "") + ".svg";
        },
    },
    methods: {
        onInput(event) {
            this.$emit("update:modelValue", event.target.value);
        },
        clear() {
            this.$emit("update:modelValue", "");
            this.$refs.input.focus();
        },
        dismissKeyboard() {
            this.$refs.input.blur();
        },
    },
    template: `
        <div class="search-bar" role="search">
            <label class="search-bar__field">
                <img :src="icon" alt="" aria-hidden="true" />
                <input
                    ref="input"
                    type="search"
                    :value="modelValue"
                    :aria-label="label"
                    :placeholder="placeholder"
                    autocomplete="off"
                    autocapitalize="off"
                    autocorrect="off"
                    spellcheck="false"
                    enterkeyhint="search"
                    @input="onInput"
                    @keydown.enter.prevent="dismissKeyboard"
                    @keydown.esc.prevent="modelValue && clear()"
                />
            </label>
            <button
                v-if="modelValue"
                type="button"
                class="search-bar__clear"
                aria-label="Clear search"
                @click="clear"
            >&times;</button>
        </div>
    `,
};
