import { GameSchema } from "../../domain/core/game-schema";
export const FacilitySchema : GameSchema = 
{ 
    required: ["classing", 
               "skills", 
               "modifiers",
               "economy", 
               "scoring",
               "flags",
               "skillLog",
               "quality",
               "song"] as const
};
