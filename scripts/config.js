import { MODULE_ID } from "./main.js";

const ECHItems = {};

export function initConfig() {
    Hooks.on("argonInit", (CoreHUD) => {
        if (game.system.id !== "sw5e") return;
        registerItems();
        const ARGON = CoreHUD.ARGON;

        const actionTypes = {
            action: ["action"],
            bonus: ["bonus"],
            reaction: ["reaction", "reactiondamage", "reactionmanual"],
            free: ["special"],
        };

        const itemTypes = {
            power: ["power", "maneuver"],
            feat: ["feat"],
            consumable: ["consumable", "equipment", "loot"],
        };

        const mainBarFeatures = [];

        if (game.settings.get(MODULE_ID, "showWeaponsItems")) itemTypes.consumable.push("weapon");
        if (game.settings.get(MODULE_ID, "showClassActions")) mainBarFeatures.push("class");

        CoreHUD.SW5E = {
            actionTypes,
            itemTypes,
            mainBarFeatures,
            ECHItems,
        };

        Hooks.callAll("enhanced-combat-hud.sw5e.initConfig", { actionTypes, itemTypes, ECHItems });

        async function getTooltipDetails(item, type) {
            let title, description, itemType, subtitle, target, range, dt;
            let damageTypes = [];
            let properties = [];
            let materialComponents = "";

            if (type == "skill") {
                title = CONFIG.SW5E.skills[item].label;
                description = game.i18n.localize(`enhancedcombathud-sw5e.skills.${item}.tooltip`);
            } else if (type == "save") {
                title = CONFIG.SW5E.abilities[item].label;
                description = game.i18n.localize(`enhancedcombathud-sw5e.abilities.${item}.tooltip`);
            } else {
                if (!item || !item.system) return;

                title = item.name;
                description = item.system.description.value;
                itemType = item.type;
                target = item.labels?.target || "-";
                range = item.labels?.range || "-";
                properties = [];
                dt = item.labels?.damageTypes?.split(", ");
                damageTypes = dt && dt.length ? dt : [];
                materialComponents = "";

                switch (itemType) {
                    case "weapon":
                        subtitle = CONFIG.SW5E.weaponTypes[item.system.weaponType];
                        properties.push(CONFIG.SW5E.itemActionTypes[item.system.actionType]);
                        for (let [key, value] of Object.entries(item.system.properties)) {
                            let prop = value && CONFIG.SW5E.weaponProperties[key] ? CONFIG.SW5E.weaponProperties[key] : undefined;
                            if (prop) properties.push(prop.name);
                        }
                        break;
                    case "power":
                        subtitle = `${item.labels.level} ${item.labels.school}`;
                        properties.push(CONFIG.SW5E.powerSchools[item.system.school]);
                        properties.push(item.labels.duration);
                        properties.push(item.labels.save);
                        for (let comp of item.labels.components.all) {
                            properties.push(comp.abbr);
                        }
                        if (item.labels.materials) materialComponents = item.labels.materials;
                        break;
                    case "consumable":
                        subtitle = CONFIG.SW5E.consumableTypes[item.system.consumableType];
                        properties.push(CONFIG.SW5E.itemActionTypes[item.system.actionType]);
                        break;
                    case "feat":
                        subtitle = item.system.requirements;
                        properties.push(CONFIG.SW5E.itemActionTypes[item.system.actionType]);
                        break;
                }
            }

            if (description) description = await TextEditor.enrichHTML(description);
            let details = [];
            if (target || range) {
                details = [
                    {
                        label: "enhancedcombathud-sw5e.tooltip.target.name",
                        value: target,
                    },
                    {
                        label: "enhancedcombathud-sw5e.tooltip.range.name",
                        value: range,
                    },
                ];
            }
            if (item.labels.toHit) {
                details.push({
                    label: "enhancedcombathud-sw5e.tooltip.toHit.name",
                    value: item.labels.toHit,
                });
            }
            if (item.labels.derivedDamage?.length) {
                let dmgString = "";
                item.labels.derivedDamage.forEach((dDmg) => {
                    dmgString += dDmg.formula + " " + getDamageTypeIcon(dDmg.damageType) + " ";
                });
                details.push({
                    label: "enhancedcombathud-sw5e.tooltip.damage.name",
                    value: dmgString,
                });
            }

            const tooltipProperties = [];
            if (damageTypes?.length) damageTypes.forEach((d) => tooltipProperties.push({ label: d, primary: true }));
            if (properties?.length) properties.forEach((p) => tooltipProperties.push({ label: p, secondary: true }));

            return { title, description, subtitle, details, properties: tooltipProperties, footerText: materialComponents };
        }

        function getDamageTypeIcon(damageType) {
            switch (damageType.toLowerCase()) {
                case "acid":
                    return '<i class="fas fa-flask"></i>';
                case "bludgeoning":
                    return '<i class="fas fa-hammer"></i>';
                case "cold":
                    return '<i class="fas fa-snowflake"></i>';
                case "fire":
                    return '<i class="fas fa-fire"></i>';
                case "force":
                    return '<i class="fas fa-hand-sparkles"></i>';
                case "lightning":
                    return '<i class="fas fa-bolt"></i>';
                case "necrotic":
                    return '<i class="fas fa-skull"></i>';
                case "piercing":
                    return '<i class="fas fa-crosshairs"></i>';
                case "poison":
                    return '<i class="fas fa-skull-crossbones"></i>';
                case "psychic":
                    return '<i class="fas fa-brain"></i>';
                case "radiant":
                    return '<i class="fas fa-sun"></i>';
                case "slashing":
                    return '<i class="fas fa-cut"></i>';
                case "thunder":
                    return '<i class="fas fa-bell"></i>';
                case "healing":
                    return '<i class="fas fa-heart"></i>';
                default:
                    return "";
            }
        }

        function getProficiencyIcon(proficiency) {
            if (proficiency == 0) return '<i style="margin-right: 1ch; pointer-events: none" class="far fa-circle"> </i>';
            else if (proficiency == 1) return '<i style="margin-right: 1ch; pointer-events: none" class="fas fa-check"> </i>';
            else if (proficiency == 2) return '<i style="margin-right: 1ch; pointer-events: none" class="fas fa-check-double"> </i>';
            else if (proficiency == 0.5) return '<i style="margin-right: 1ch; pointer-events: none" class="fas fa-adjust"> </i>';
            else return '<i style="margin-right: 1ch; pointer-events: none" class="far fa-circle"> </i>';
        }

        class SW5ePortraitPanel extends ARGON.PORTRAIT.PortraitPanel {
            constructor(...args) {
                super(...args);
            }

            get description() {
                const { type, system } = this.actor;
                const actor = this.actor;
                const isNPC = type === "npc";
                const isPC = type === "character";
                if (isNPC) {
                    const creatureType = game.i18n.localize(CONFIG.SW5E.creatureTypes[actor.system.details.type.value] ?? actor.system.details.type.custom);
                    const cr = system.details.cr >= 1 || system.details.cr <= 0 ? system.details.cr : `1/${1 / system.details.cr}`;
                    return `CR ${cr} ${creatureType}`;
                } else if (isPC) {
                    const classes = Object.values(actor.classes)
                        .map((c) => c.name)
                        .join(" / ");
                    return `Level ${system.details.level} ${classes} (${system.details.race})`;
                } else {
                    return "";
                }
            }

            get isDead() {
                return this.isDying && this.actor.type !== "character";
            }

            get isDying() {
                return this.actor.system.attributes.hp.value <= 0;
            }

            get successes() {
                return this.actor.system.attributes?.death?.success ?? 0;
            }

            get failures() {
                return this.actor.system.attributes?.death?.failure ?? 0;
            }

            async _onDeathSave(event) {
                this.actor.rollDeathSave({});
            }

            async getStatBlocks() {
                const HPText = game.i18n
                    .localize("SW5E.HitPoints")
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase())
                    .join("");
                const ACText = game.i18n
                    .localize("SW5E.ArmorClass")
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase())
                    .join("");
                const PowerDC = game.i18n.localize("SW5E.SaveDC").replace("{ability}", "").replace("{dc}", "").trim();

                const hpColor = this.actor.system.attributes.hp.temp ? "#6698f3" : "rgb(0 255 170)";
                const tempMax = this.actor.system.attributes.hp.tempmax;
                const hpMaxColor = tempMax ? (tempMax > 0 ? "rgb(222 91 255)" : "#ffb000") : "rgb(255 255 255)";

                return [
                    [
                        {
                            text: `${this.actor.system.attributes.hp.value + (this.actor.system.attributes.hp.temp ?? 0)}`,
                            color: hpColor,
                        },
                        {
                            text: `/`,
                        },
                        {
                            text: `${this.actor.system.attributes.hp.max + (this.actor.system.attributes.hp.tempmax ?? 0)}`,
                            color: hpMaxColor,
                        },
                        {
                            text: HPText,
                        },
                    ],
                    [
                        {
                            text: ACText,
                        },
                        {
                            text: this.actor.system.attributes.ac.value,
                            color: "var(--ech-movement-baseMovement-background)",
                        },
                    ],
                    [
                        {
                            text: PowerDC,
                        },
                        {
                            text: this.actor.system.attributes.powerdc,
                            color: "var(--ech-movement-baseMovement-background)",
                        },
                    ],
                ];
            }
        }

        class SW5eDrawerButton extends ARGON.DRAWER.DrawerButton {
            constructor(buttons, item, type) {
                super(buttons);
                this.item = item;
                this.type = type;
            }

            get hasTooltip() {
                return true;
            }

            get tooltipOrientation() {
                return TooltipManager.TOOLTIP_DIRECTIONS.RIGHT;
            }

            async getTooltipData() {
                const tooltipData = await getTooltipDetails(this.item, this.type);
                return tooltipData;
            }
        }

        class SW5eDrawerPanel extends ARGON.DRAWER.DrawerPanel {
            constructor(...args) {
                super(...args);
            }

            get categories() {
                const abilities = this.actor.system.abilities;
                const skills = this.actor.system.skills;
                const tools = this.actor.itemTypes.tool;

                const addSign = (value) => {
                    if (value >= 0) return `+${value}`;
                    return value;
                };

                const abilitiesButtons = Object.keys(abilities).map((ability) => {
                    const abilityData = abilities[ability];
                    return new SW5eDrawerButton(
                        [
                            {
                                label: CONFIG.SW5E.abilities[ability].label,
                                onClick: (event) => this.actor.rollAbility(ability, { event }),
                            },
                            {
                                label: addSign(abilityData.mod),
                                onClick: (event) => this.actor.rollAbilityTest(ability, { event }),
                            },
                            {
                                label: addSign(abilityData.save),
                                onClick: (event) => this.actor.rollAbilitySave(ability, { event }),
                            },
                        ],
                        ability,
                        "save",
                    );
                });

                const skillsButtons = Object.keys(skills).map((skill) => {
                    const skillData = skills[skill];
                    return new SW5eDrawerButton(
                        [
                            {
                                label: getProficiencyIcon(skillData.proficient) + CONFIG.SW5E.skills[skill].label,
                                onClick: (event) => this.actor.rollSkill(skill, { event }),
                            },
                            {
                                label: `${addSign(skillData.mod)}<span style="margin: 0 1rem; filter: brightness(0.8)">(${skillData.passive})</span>`,
                                style: "display: flex; justify-content: flex-end;",
                            },
                        ],
                        skill,
                        "skill",
                    );
                });

                const toolButtons = tools.map((tool) => {
                    return new SW5eDrawerButton(
                        [
                            {
                                label: getProficiencyIcon(tool.system.proficient) + tool.name,
                                onClick: (event) => tool.rollToolCheck({ event }),
                            },
                            {
                                label: addSign(abilities[tool.abilityMod].mod + tool.system.proficiencyMultiplier * this.actor.system.attributes.prof),
                            },
                        ],
                        tool,
                    );
                });

                return [
                    {
                        gridCols: "5fr 2fr 2fr",
                        captions: [
                            {
                                label: "Abilities",
                                align: "left",
                            },
                            {
                                label: "Check",
                                align: "center",
                            },
                            {
                                label: "Save",
                                align: "center",
                            },
                        ],
                        align: ["left", "center", "center"],
                        buttons: abilitiesButtons,
                    },
                    {
                        gridCols: "7fr 2fr",
                        captions: [
                            {
                                label: "Skills",
                            },
                            {
                                label: "",
                            },
                        ],
                        buttons: skillsButtons,
                    },
                    {
                        gridCols: "7fr 2fr",
                        captions: [
                            {
                                label: "Tools",
                            },
                            {
                                label: "",
                            },
                        ],
                        buttons: toolButtons,
                    },
                ];
            }

            get title() {
                return `${game.i18n.localize("enhancedcombathud-sw5e.hud.saves.name")} / ${game.i18n.localize("enhancedcombathud-sw5e.hud.skills.name")} / ${game.i18n.localize("enhancedcombathud-sw5e.hud.tools.name")}`;
            }
        }

        class SW5eActionActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
            }

            get label() {
                return "SW5E.Action";
            }

            get maxActions() {
                return this.actor.inCombat ? 1 : null;
            }

            get currentActions() {
                return this.isActionUsed ? 0 : 1;
            }

            _onNewRound(combat) {
                this.isActionUsed = false;
                this.updateActionUse();
            }

            async _getButtons() {
                const powerItems = this.actor.items.filter((item) => itemTypes.power.includes(item.type) && actionTypes.action.includes(item.system.activation?.type) && !CoreHUD.SW5E.mainBarFeatures.includes(item.system.type?.value));
                const maneuverItems = this.actor.items.filter((item) => itemTypes.maneuver.includes(item.type) && actionTypes.action.includes(item.system.activation?.type) && !CoreHUD.SW5E.mainBarFeatures.includes(item.system.type?.value));
                const featItems = this.actor.items.filter((item) => itemTypes.feat.includes(item.type) && actionTypes.action.includes(item.system.activation?.type) && !CoreHUD.SW5E.mainBarFeatures.includes(item.system.type?.value));
                const consumableItems = this.actor.items.filter((item) => itemTypes.consumable.includes(item.type) && actionTypes.action.includes(item.system.activation?.type) && !CoreHUD.SW5E.mainBarFeatures.includes(item.system.type?.value));

                const powerButton = !powerItems.length ? [] : [new SW5eButtonPanelButton({ type: "power", items: powerItems, color: 0 })].filter((button) => button.hasContents);

                const specialActions = Object.values(ECHItems);

                const showSpecialActions = game.settings.get(MODULE_ID, "showSpecialActions");

                const buttons = [
                    new SW5eItemButton({ item: null, isWeaponSet: true, isPrimary: true }),
                    new ARGON.MAIN.BUTTONS.SplitButton(
                        new SW5eSpecialActionButton(specialActions[0]),
                        new SW5eSpecialActionButton(specialActions[1])
                    ),
                    ...powerButton,
                    new SW5eButtonPanelButton({ type: "feat", items: featItems, color: 0 }),
                    new ARGON.MAIN.BUTTONS.SplitButton(
                        new SW5eSpecialActionButton(specialActions[2]),
                        new SW5eSpecialActionButton(specialActions[3])
                    ),
                    new ARGON.MAIN.BUTTONS.SplitButton(
                        new SW5eSpecialActionButton(specialActions[4]),
                        new SW5eSpecialActionButton(specialActions[5])
                    ),
                    new SW5eButtonPanelButton({ type: "consumable", items: consumableItems, color: 0 })
                ];

                const barItems = this.actor.items.filter((item) => CoreHUD.SW5E.mainBarFeatures.includes(item.system.type?.value) && actionTypes.action.includes(item.system.activation?.type));
                for (const item of barItems) {
                    buttons.push(new SW5eItemButton({ item, inActionPanel: true }));
                }

                return buttons.filter((button) => button.items == undefined || button.items.length).filter((button) => showSpecialActions || !(button instanceof ARGON.MAIN.BUTTONS.SplitButton));
            }
        }

        class SW5eBonusActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
            }

            get label() {
                return "SW5E.BonusAction";
            }

            get maxActions() {
                return this.actor.inCombat ? 1 : null;
            }

            get currentActions() {
                return this.isActionUsed ? 0 : 1;
            }

            _onNewRound(combat) {
                this.isActionUsed = false;
                this.updateActionUse();
            }

            async _getButtons() {
                const buttons = [new SW5eItemButton({ item: null, isWeaponSet: true, isPrimary: false })];
                for (const [type, types] of Object.entries(itemTypes)) {
                    const items = this.actor.items.filter((item) => types.includes(item.type) && actionTypes.bonus.includes(item.system.activation?.type) && !CoreHUD.SW5E.mainBarFeatures.includes(item.system.type?.value));
                    if (!items.length) continue;
                    const button = new SW5eButtonPanelButton({ type, items, color: 1 })
                    if(button.hasContents) buttons.push(button);
                }

                const barItems = this.actor.items.filter((item) => CoreHUD.SW5E.mainBarFeatures.includes(item.system.type?.value) && actionTypes.bonus.includes(item.system.activation?.type));
                for (const item of barItems) {
                    buttons.push(new SW5eItemButton({ item, inActionPanel: true }));
                }

                return buttons;
            }
        }

        class SW5eReactionActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
            }

            get label() {
                return "SW5E.Reaction";
            }

            get maxActions() {
                return this.actor.inCombat ? 1 : null;
            }

            get currentActions() {
                return this.isActionUsed ? 0 : 1;
            }

            _onNewRound(combat) {
                this.isActionUsed = false;
                this.updateActionUse();
            }

            async _getButtons() {
                const buttons = [new SW5eItemButton({ item: null, isWeaponSet: true, isPrimary: true })];
                //buttons.push(new SW5eEquipmentButton({slot: 1}));
                for (const [type, types] of Object.entries(itemTypes)) {
                    const items = this.actor.items.filter((item) => types.includes(item.type) && actionTypes.reaction.includes(item.system.activation?.type) && !CoreHUD.SW5E.mainBarFeatures.includes(item.system.type?.value));
                    if (!items.length) continue;
                    const button = new SW5eButtonPanelButton({ type, items, color: 3 })
                    if(button.hasContents) buttons.push(button);
                }

                const barItems = this.actor.items.filter((item) => CoreHUD.SW5E.mainBarFeatures.includes(item.system.type?.value) && actionTypes.reaction.includes(item.system.activation?.type));
                for (const item of barItems) {
                    buttons.push(new SW5eItemButton({ item, inActionPanel: true }));
                }

                return buttons;
            }
        }

        class SW5eFreeActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
            }

            get label() {
                return "SW5E.Special";
            }

            get maxActions() {
                return this.actor.inCombat ? 1 : null;
            }

            get currentActions() {
                return this.isActionUsed ? 0 : 1;
            }

            _onNewRound(combat) {
                this.isActionUsed = false;
                this.updateActionUse();
            }

            async _getButtons() {
                const buttons = [];

                for (const [type, types] of Object.entries(itemTypes)) {
                    const items = this.actor.items.filter((item) => types.includes(item.type) && actionTypes.free.includes(item.system.activation?.type) && !CoreHUD.SW5E.mainBarFeatures.includes(item.system.type?.value));
                    if (!items.length) continue;
                    const button = new SW5eButtonPanelButton({ type, items, color: 2 })
                    if(button.hasContents) buttons.push(button);
                }

                const barItems = this.actor.items.filter((item) => CoreHUD.SW5E.mainBarFeatures.includes(item.system.type?.value) && actionTypes.free.includes(item.system.activation?.type));
                for (const item of barItems) {
                    buttons.push(new SW5eItemButton({ item, inActionPanel: true }));
                }

                return buttons;
            }
        }

        class SW5eLegActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
            }

            get label() {
                return "SW5E.LegendaryActionLabel";
            }

            get maxActions() {
                return this.actor.inCombat ? this.actor.system.resources?.legact?.max ?? null : null;
            }

            get currentActions() {
                return this.actor.system.resources?.legact?.value ?? null;
            }

            async _getButtons() {
                const buttons = [];
                const legendary = this.actor.items.filter((item) => item.system.activation?.type === "legendary");
                legendary.forEach((item) => {
                    buttons.push(new SW5eItemButton({ item, inActionPanel: true }));
                });
                return buttons;
            }
        }

        class SW5eLairActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
            }

            get label() {
                return "SW5E.LairActionLabel";
            }

            get maxActions() {
                return this.actor.inCombat ? 1 : null;
            }

            get currentActions() {
                return this.actor.system.resources.lair?.value * 1;
            }

            async _getButtons() {
                const buttons = [];
                const lair = this.actor.items.filter((item) => item.system.activation?.type === "lair");
                lair.forEach((item) => {
                    buttons.push(new SW5eItemButton({ item, inActionPanel: true }));
                });
                return buttons;
            }
        }

        class SW5eItemButton extends ARGON.MAIN.BUTTONS.ItemButton {
            constructor(...args) {
                super(...args);
            }

            get hasTooltip() {
                return true;
            }

            get ranges() {
                const item = this.item;
                const touchRange = item.system.range.units == "touch" ? canvas?.scene?.grid?.distance : null;
                return {
                    normal: item.system?.range?.value ?? touchRange,
                    long: item.system?.range?.long ?? null,
                };
            }

            get targets() {
                const item = this.item;
                const validTargets = ["creature", "ally", "enemy"];
                const actionType = item.system.actionType;
                const targetType = item.system.target?.type;
                if (validTargets.includes(targetType)) {
                    return item.system.target.value;
                } else {
                    if (actionType === "mwak" || actionType === "rwak") {
                        return 1;
                    }
                }
                return null;
            }

            get visible() {
                if(!this._isWeaponSet || this._isPrimary) return super.visible;
                return super.visible && !this.item?.system?.armor?.type === "shield";
            }

            async getTooltipData() {
                const tooltipData = await getTooltipDetails(this.item);
                tooltipData.propertiesLabel = "enhancedcombathud-sw5e.tooltip.properties.name";
                return tooltipData;
            }

            async _onLeftClick(event) {
                ui.ARGON.interceptNextDialog(event.currentTarget);
                const used = await this.item.use({ event }, { event });
                if (used) {
                    SW5eItemButton.consumeActionEconomy(this.item);
                }
            }

            async _onRightClick(event) {
                this.item?.sheet?.render(true);
            }

            static consumeActionEconomy(item) {
                const activationType = item.system.activation?.type;
                let actionType = null;
                for (const [type, types] of Object.entries(actionTypes)) {
                    if (types.includes(activationType)) actionType = type;
                }
                if (!actionType) return;
                if (game.combat?.combatant?.actor !== item.parent) actionType = "reaction";
                if (actionType === "action") {
                    ui.ARGON.components.main[0].isActionUsed = true;
                    ui.ARGON.components.main[0].updateActionUse();
                } else if (actionType === "bonus") {
                    ui.ARGON.components.main[1].isActionUsed = true;
                    ui.ARGON.components.main[1].updateActionUse();
                } else if (actionType === "reaction") {
                    ui.ARGON.components.main[2].isActionUsed = true;
                    ui.ARGON.components.main[2].updateActionUse();
                } else if (actionType === "free") {
                    ui.ARGON.components.main[3].isActionUsed = true;
                    ui.ARGON.components.main[3].updateActionUse();
                } else if (actionType === "legendary") {
                    ui.ARGON.components.main[4].isActionUsed = true;
                }
            }

            async render(...args) {
                await super.render(...args);
                if (this.item) {
                    const weapons = this.actor.items.filter((item) => item.system.consume?.target === this.item.id);
                    ui.ARGON.updateItemButtons(weapons);
                }
            }

            get quantity() {
                if (!this.item?.system) return null;
                const showQuantityItemTypes = ["consumable"];
                const consumeType = this.item.system.consume?.type;
                if (consumeType === "ammo") {
                    const ammoItem = this.actor.items.get(this.item.system.consume.target);
                    if (!ammoItem) return null;
                    return Math.floor((ammoItem.system.quantity ?? 0) / this.item.system.consume.amount);
                } else if (consumeType === "attribute") {
                    return Math.floor(getProperty(this.actor.system, this.item.system.consume.target) / this.item.system.consume.amount);
                } else if (consumeType === "charges") {
                    const chargesItem = this.actor.items.get(this.item.system.consume.target);
                    if (!chargesItem) return null;
                    return Math.floor((chargesItem.system.uses?.value ?? 0) / this.item.system.consume.amount);
                } else if (showQuantityItemTypes.includes(this.item.type)) {
                    return this.item.system.uses?.value ?? this.item.system.quantity;
                } else if (this.item.system.uses.value !== null && this.item.system.uses.per !== null) {
                    return this.item.system.uses.value;
                }
                return null;
            }
        }

        class SW5eButtonPanelButton extends ARGON.MAIN.BUTTONS.ButtonPanelButton {
            constructor({ type, items, color }) {
                super();
                this.type = type;
                this.items = items;
                this.color = color;
                this._powers = this.prePreparePowers();
            }

            get hasContents() {
                return this._powers ? !!this._powers.length : !!this.items.length;
            }

            get colorScheme() {
                return this.color;
            }

            get id() {
                return `${this.type}-${this.color}`
            }

            get label() {
                switch (this.type) {
                    case "power":
                        return "enhancedcombathud-sw5e.hud.castpower.name";
                    case "maneuver":
                        return "enhancedcombathud-sw5e.hud.usemaneuver.name";
                    case "feat":
                        return "enhancedcombathud-sw5e.hud.usefeature.name";
                    case "consumable":
                        return "enhancedcombathud-sw5e.hud.useitem.name";
                }
            }

            get icon() {
                switch (this.type) {
                    case "power":
                        return "modules/enhancedcombathud/icons/spell-book.webp";
                    case "maneuver":
                        return "modules/enhancedcombathud/icons/mighty-force.webp";
                    case "feat":
                        return "modules/enhancedcombathud/icons/mighty-force.webp";
                    case "consumable":
                        return "modules/enhancedcombathud/icons/drink-me.webp";
                }
            }

            get showPreparedOnly() {
                if (this.actor.type !== "character") return false;
                const classes = Object.keys(this.actor.classes);
                const requiresPreparation = ["cleric", "druid", "paladin", "wizard", "artificer", "ranger"].some((className) => classes.includes(className));
                return requiresPreparation;
            }

            prePreparePowers() {
                if (this.type !== "power") return;
                
                const powerLevels = CONFIG.SW5e.powerLevels;
                const itemsWithPowers = [];
                const itemsToIgnore = [];
                if (game.modules.get("items-with-powers-5e")?.active) {
                    const actionType = this.items[0].system.activation?.type;
                    const powerItems = this.actor.items.filter((item) => item.flags["items-with-powers-5e"]?.["item-powers"]?.length);
                    for (const item of powerItems) {
                        const powerData = item.flags["items-with-powers-5e"]["item-powers"];
                        const itemsInPower = powerData.map((power) => this.actor.items.get(power.id)).filter((item) => item && item.system.activation?.type === actionType);
                        if(!itemsInPower.length) continue;
                        itemsToIgnore.push(...itemsInPower);
                        if(item.system.attunement === 1) continue;
                        itemsWithPowers.push({
                            label: item.name,
                            buttons: itemsInPower.map((item) => new SW5eItemButton({ item })),
                            uses: () => {return { max: item.system.uses?.max, value: item.system.uses?.value }},
                        });
                    }
                    this.items = this.items.filter((item) => !itemsToIgnore.includes(item));
                }
                if (this.showPreparedOnly) {
                    const allowIfNotPrepared = ["atwill", "innate", "pact", "always"];
                    this.items = this.items.filter((item) => {
                        if (allowIfNotPrepared.includes(item.system.preparation.mode)) return true;
                        if (item.system.level == 0) return true;
                        return item.system.preparation.prepared;
                    });
                }

                const powers = [
                    ...itemsWithPowers,
                    {
                        label: "SW5E.PowerPrepAtWill",
                        buttons: this.items.filter((item) => item.system.preparation.mode === "atwill").map((item) => new SW5eItemButton({ item })),
                        uses: { max: Infinity, value: Infinity },
                    },
                    {
                        label: "SW5E.PowerPrepInnate",
                        buttons: this.items.filter((item) => item.system.preparation.mode === "innate").map((item) => new SW5eItemButton({ item })),
                        uses: { max: Infinity, value: Infinity },
                    },
                    {
                        label: Object.values(powerLevels)[0],
                        buttons: this.items.filter((item) => item.system.level == 0).map((item) => new SW5eItemButton({ item })),
                        uses: { max: Infinity, value: Infinity },
                    },
                    {
                        label: "SW5E.PactMagic",
                        buttons: this.items.filter((item) => item.system.preparation.mode === "pact").map((item) => new SW5eItemButton({ item })),
                        uses: () => { return this.actor.system.powers.pact }
                    },
                ];
                for (const [level, label] of Object.entries(powerLevels)) {
                    const levelPowers = this.items.filter((item) => item.system.level == level && (item.system.preparation.mode === "prepared" || item.system.preparation.mode === "always"));
                    if (!levelPowers.length || level == 0) continue;
                    powers.push({
                        label,
                        buttons: levelPowers.map((item) => new SW5eItemButton({ item })),
                        uses: () => { return this.actor.system.powers[`power${level}`] },
                    });
                }
                return powers.filter((power) => power.buttons.length);
            }

            async _getPanel() {
                if (this.type === "power") {
                    return new ARGON.MAIN.BUTTON_PANELS.ACCORDION.AccordionPanel({ id: this.id, accordionPanelCategories: this._powers.map(({ label, buttons, uses }) => new ARGON.MAIN.BUTTON_PANELS.ACCORDION.AccordionPanelCategory({ label, buttons, uses })) });
                } else {
                    return new ARGON.MAIN.BUTTON_PANELS.ButtonPanel({ id: this.id, buttons: this.items.map((item) => new SW5eItemButton({ item })) });
                }
            }
        }

        class SW5eSpecialActionButton extends ARGON.MAIN.BUTTONS.ActionButton {
            constructor(specialItem) {
                super();
                const actorItem = this.actor.items.getName(specialItem.name);
                this.item =
                    actorItem ??
                    new CONFIG.Item.documentClass(specialItem, {
                        parent: this.actor,
                    });
            }

            get label() {
                return this.item.name;
            }

            get icon() {
                return this.item.img;
            }

            get hasTooltip() {
                return true;
            }

            async getTooltipData() {
                const tooltipData = await getTooltipDetails(this.item);
                tooltipData.propertiesLabel = "enhancedcombathud-sw5e.tooltip.properties.name";
                return tooltipData;
            }

            async _onLeftClick(event) {
                const useCE = game.modules.get("dfreds-convenient-effects")?.active && game.dfreds.effectInterface.findEffectByName(this.label);
                let success = false;
                if (useCE) {
                    success = true;
                    await game.dfreds.effectInterface.toggleEffect(this.label, { overlay: false, uuids: [this.actor.uuid] });
                } else {
                    success = await this.item.use({ event }, { event });
                }
                if (success) {
                    SW5eItemButton.consumeActionEconomy(this.item);
                }
            }
        }

        class SW5eMovementHud extends ARGON.MovementHud {
            constructor(...args) {
                super(...args);
                this.getMovementMode = game.modules.get('elevation-drag-ruler')?.api?.getMovementMode;
            }

            get movementMode() {
                return this.getMovementMode ? this.getMovementMode(this.token) : 'walk';
            }

            get movementMax() {
                return this.actor.system.attributes.movement[this.movementMode] / canvas.scene.dimensions.distance;
            }
        }

        class SW5eWeaponSets extends ARGON.WeaponSets {
            async getDefaultSets() {
                const sets = await super.getDefaultSets();
                if (this.actor.type !== "npc") return sets;
                const actions = this.actor.items.filter((item) => item.type === "weapon" && item.system.activation?.type === "action");
                const bonus = this.actor.items.filter((item) => item.type === "weapon" && item.system.activation?.type === "bonus");
                return {
                    1: {
                        primary: actions[0]?.uuid ?? null,
                        secondary: bonus[0]?.uuid ?? null,
                    },
                    2: {
                        primary: actions[1]?.uuid ?? null,
                        secondary: bonus[1]?.uuid ?? null,
                    },
                    3: {
                        primary: actions[2]?.uuid ?? null,
                        secondary: bonus[2]?.uuid ?? null,
                    },
                };
            }

            async _onSetChange({ sets, active }) {
                const switchEquip = game.settings.get("enhancedcombathud-sw5e", "switchEquip");
                if (!switchEquip) return;
                const updates = [];
                const activeSet = sets[active];
                const activeItems = Object.values(activeSet).filter((item) => item);
                const inactiveSets = Object.values(sets).filter((set) => set !== activeSet);
                const inactiveItems = inactiveSets.flatMap((set) => Object.values(set)).filter((item) => item).filter((item) => !activeItems.includes(item));
                activeItems.forEach((item) => {
                    if (!item.system?.equipped) updates.push({ _id: item.id, "system.equipped": true });
                });
                inactiveItems.forEach((item) => {
                    if (item.system?.equipped) updates.push({ _id: item.id, "system.equipped": false });
                });
                return await this.actor.updateEmbeddedDocuments("Item", updates);
            }
        }

        CoreHUD.definePortraitPanel(SW5ePortraitPanel);
        CoreHUD.defineDrawerPanel(SW5eDrawerPanel);
        CoreHUD.defineMainPanels([SW5eActionActionPanel, SW5eBonusActionPanel, SW5eReactionActionPanel, SW5eFreeActionPanel, SW5eLegActionPanel, SW5eLairActionPanel, ARGON.PREFAB.PassTurnPanel]);
        CoreHUD.defineMovementHud(SW5eMovementHud);
        CoreHUD.defineWeaponSets(SW5eWeaponSets);
        CoreHUD.defineSupportedActorTypes(["character", "npc"]);
    });
}

function registerItems() {
    ECHItems[game.i18n.localize("enhancedcombathud-sw5e.items.dash.name")] = {
        name: game.i18n.localize("enhancedcombathud-sw5e.items.dash.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/walking-boot.svg",
        system: {
            description: {
                value: game.i18n.localize("enhancedcombathud-sw5e.items.dash.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: null,
                units: "",
            },
            target: {
                value: null,
                width: null,
                units: "",
                type: "self",
            },
            range: {
                value: null,
                long: null,
                units: "",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "power",
            },
            consumableType: "trinket",
        },
        effects: [
            {
                _id: "PPMPZY1t3AUB7UGA",
                changes: [],
                disabled: false,
                duration: {
                    startTime: null,
                    rounds: 1,
                },
                icon: "modules/enhancedcombathud/icons/walking-boot.svg",
                label: "Dash",
                transfer: false,
                flags: {
                    dae: {
                        stackable: "none",
                        macroRepeat: "none",
                        specialDuration: [],
                        transfer: false,
                    },
                },
                tint: "",
            },
        ],
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-sw5e.items.disengage.name")] = {
        name: game.i18n.localize("enhancedcombathud-sw5e.items.disengage.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/journey.webp",
        system: {
            description: {
                value: game.i18n.localize("enhancedcombathud-sw5e.items.disengage.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: 1,
                units: "turn",
            },
            target: {
                value: null,
                width: null,
                units: "",
                type: "self",
            },
            range: {
                value: null,
                long: null,
                units: "",
            },
            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "power",
            },
        },
        effects: [
            {
                _id: "8FtZnIC1vbyKZ6xF",
                changes: [],
                disabled: false,
                duration: {
                    startTime: null,
                    turns: 1,
                },
                icon: "modules/enhancedcombathud/icons/journey.webp",
                label: "Disengage",
                origin: "Item.wyQkeuZkttllAFB1",
                transfer: false,
                flags: {
                    dae: {
                        stackable: "none",
                        macroRepeat: "none",
                        specialDuration: [],
                        transfer: false,
                    },
                },
                tint: "",
            },
        ],
        sort: 0,
        flags: {
            core: {
                sourceId: "Item.wyQkeuZkttllAFB1",
            },

            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-sw5e.items.dodge.name")] = {
        name: game.i18n.localize("enhancedcombathud-sw5e.items.dodge.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/armor-upgrade.webp",
        system: {
            description: {
                value: game.i18n.localize("enhancedcombathud-sw5e.items.dodge.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: 1,
                units: "round",
            },
            target: {
                value: null,
                width: null,
                units: "",
                type: "self",
            },
            range: {
                value: null,
                long: null,
                units: "",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "power",
            },
            consumableType: "trinket",
        },
        effects: [
            {
                _id: "2xH2YQ6pm430O0Aq",
                changes: [
                    {
                        key: "flags.sw5e.grants.disadvantage.attack.all",
                        mode: 5,
                        value: "1"
                    }, {
                        key: "flags.sw5e.advantage.ability.save.dex",
                        mode: 5,
                        value: "1"
                    }
                ],
                disabled: false,
                duration: {
                    startTime: null,
                    rounds: 1,
                },
                icon: "modules/enhancedcombathud/icons/armor-upgrade.webp",
                label: "Dodge",
                origin: "Item.pakEYcgLYxtKGv7J",
                transfer: false,
                flags: {
                    dae: {
                        stackable: "none",
                        macroRepeat: "none",
                        specialDuration: [],
                        transfer: false,
                    },
                },
                tint: "",
            },
        ],
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-sw5e.items.hide.name")] = {
        name: game.i18n.localize("enhancedcombathud-sw5e.items.hide.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/cloak-dagger.webp",
        system: {
            description: {
                value: game.i18n.localize("enhancedcombathud-sw5e.items.hide.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: null,
                units: "",
            },
            target: {
                value: null,
                width: null,
                units: "",
                type: "self",
            },
            range: {
                value: null,
                long: null,
                units: "",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            recharge: {
                value: null,
                charged: false,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "power",
            },
            consumableType: "trinket",
        },
        effects: [
            {
                _id: "SZkbtgGCICrpH0GJ",
                changes: [],
                disabled: false,
                duration: {
                    startTime: null,
                    turns: 10,
                },
                icon: "modules/enhancedcombathud/icons/cloak-dagger.webp",
                label: "Hide",
                transfer: false,
                flags: {
                    dae: {
                        stackable: "none",
                        macroRepeat: "none",
                        specialDuration: [],
                        transfer: false,
                    },
                },
                tint: "",
            },
        ],
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-sw5e.items.grapple.name")] = {
        name: game.i18n.localize("enhancedcombathud-sw5e.items.grapple.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/cloak-dagger.svg",
        system: {
            description: {
                value: game.i18n.localize("enhancedcombathud-sw5e.items.grapple.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: null,
                units: "",
            },
            target: {
                value: 1,
                width: null,
                units: "",
                type: "creature",
            },
            range: {
                value: null,
                long: null,
                units: "touch",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "power",
            },
            consumableType: "trinket",
        },
        effects: [],
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-sw5e.items.shove.name")] = {
        name: game.i18n.localize("enhancedcombathud-sw5e.items.shove.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/shield-bash.webp",
        system: {
            description: {
                value: game.i18n.localize("enhancedcombathud-sw5e.items.shove.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: null,
                units: "",
            },
            target: {
                value: 1,
                width: null,
                units: "",
                type: "creature",
            },
            range: {
                value: null,
                long: null,
                units: "touch",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "power",
            },
            consumableType: "trinket",
        },
        effects: [],
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-sw5e.items.guard.name")] = {
        name: game.i18n.localize("enhancedcombathud-sw5e.items.guard.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/clockwork.svg",
        system: {
            description: {
                value: game.i18n.localize("enhancedcombathud-sw5e.items.guard.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: null,
                units: "",
            },
            target: {
                value: 1,
                width: null,
                units: "",
                type: "ally",
            },
            range: {
                value: null,
                long: null,
                units: "touch",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "power",
            },
            consumableType: "trinket",
        },
        effects: [
            {
                _id: "Hl2vvhBqqpvmuont",
                changes: [
                    {
                        key: "flags.sw5e.grants.disadvantage.attack.all",
                        mode: 5,
                        value: "1"
                    }
                ],
                disabled: false,
                duration: {
                    startTime: null,
                    turns: 1,
                },
                icon: "modules/enhancedcombathud/icons/clockwork.svg",
                label: "Guarded",
                transfer: false,
                flags: {
                    dae: {
                        stackable: "none",
                        macroRepeat: "none",
                        specialDuration: [],
                        transfer: false,
                    },
                },
                tint: "",
            },
        ],
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-sw5e.items.help.name")] = {
        name: game.i18n.localize("enhancedcombathud-sw5e.items.help.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/clockwork.svg",
        system: {
            description: {
                value: game.i18n.localize("enhancedcombathud-sw5e.items.help.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: null,
                units: "",
            },
            target: {
                value: 1,
                width: null,
                units: "",
                type: "ally",
            },
            range: {
                value: null,
                long: null,
                units: "touch",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "power",
            },
            consumableType: "trinket",
        },
        effects: [
            {
                _id: "VQnlT5waDLtOPJLF",
                changes: [
                    {
                        key: "flags.sw5e.situational.advantage.all",
                        mode: 5,
                        value: "1"
                    }
                ],
                disabled: false,
                duration: {
                    startTime: null,
                    turns: 1,
                },
                icon: "modules/enhancedcombathud/icons/clockwork.svg",
                label: "Helped",
                transfer: false,
                flags: {
                    dae: {
                        stackable: "none",
                        macroRepeat: "none",
                        specialDuration: [],
                        transfer: false,
                    },
                },
                tint: "",
            },
        ],
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-sw5e.items.ready.name")] = {
        name: game.i18n.localize("enhancedcombathud-sw5e.items.ready.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/clockwork.svg",
        system: {
            description: {
                value: game.i18n.localize("enhancedcombathud-sw5e.items.ready.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: null,
                units: "",
            },
            target: {
                value: null,
                width: null,
                units: "",
                type: "self",
            },
            range: {
                value: null,
                long: null,
                units: "",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "power",
            },
            consumableType: "trinket",
        },
        effects: [
            {
                _id: "BevDb0J80M9BdoEl",
                changes: [],
                disabled: false,
                duration: {
                    startTime: null,
                    turns: 1,
                },
                icon: "modules/enhancedcombathud/icons/clockwork.svg",
                label: "Ready",
                transfer: false,
                flags: {
                    dae: {
                        stackable: "none",
                        macroRepeat: "none",
                        specialDuration: [],
                        transfer: false,
                    },
                },
                tint: "",
            },
        ],
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-sw5e.items.search.name")] = {
        name: game.i18n.localize("enhancedcombathud-sw5e.items.search.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/clockwork.svg",
        system: {
            description: {
                value: game.i18n.localize("enhancedcombathud-sw5e.items.search.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: null,
                units: "",
            },
            target: {
                value: null,
                width: null,
                units: "",
                type: "self",
            },
            range: {
                value: null,
                long: null,
                units: "",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "power",
            },
            consumableType: "trinket",
        },
        effects: [],
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };

    if (game.settings.get("enhancedcombathud-sw5e", "noAA")) {
        for (let key of Object.keys(ECHItems)) {
            delete ECHItems[key].effects;
        }
    }
}
