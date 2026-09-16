import ConfigStore from './config-store';

export default class ColourRegistry {
    private readonly configStore: ConfigStore;
    private inUseColours: string[];
    private nextColourIndex: number;

    constructor(configStore: ConfigStore) {
        this.configStore = configStore;
        this.inUseColours = [];
        this.nextColourIndex = 0;
    }

    issue(): string {
        const configuredUserColours = this.configStore.userColor;
        const userColours = this.configStore.useUserColor && Array.isArray(configuredUserColours) ?
            configuredUserColours.filter(colour => !!colour) : [];
        const colours = this.configStore.highlightColors.concat(userColours);
        const availableColour = colours.find(colour => !this.inUseColours.includes(colour));
        if (availableColour) {
            this.inUseColours = this.inUseColours.concat(availableColour);
            return availableColour;
        }

        const cycledColour = colours[this.nextColourIndex % colours.length];
        this.nextColourIndex += 1;
        return cycledColour;
    }

    reserve(colour: string): void {
        const addend = this.inUseColours.includes(colour) ? [] : [colour];
        this.inUseColours = [...this.inUseColours, ...addend];
    }

    revoke(colour: string): void {
        this.inUseColours = this.inUseColours.filter(c => c !== colour);
    }

}
