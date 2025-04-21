import mongoose,{Schema,Model,Document} from "mongoose";
export interface Consumable extends Document{

}
const ConsumableSchema:Schema<Consumable>=new Schema({}, { timestamps: true });
export const ConsumableModel:Model<Consumable>= (mongoose.models.Consumable) || mongoose.model<Consumable>("Consumable",ConsumableSchema)
