
import mongoose from "mongoose";

type ConnectionObject={
    isConnected?:number;
}
const connection:ConnectionObject={}
const dbconnect=async ():Promise<void>=>{
    if(connection.isConnected){
        console.log("Database is Already Connected")
        return
    }
    try {
        const db = await mongoose.connect(process.env.MONGODB_URI || "");
        // for Local db connection
        // const db = await mongoose.connect(process.env.MONGODB_URI || "", {
        //   useNewUrlParser: true,
        //   useUnifiedTopology: true,
        // } as ConnectOptions);
         
        connection.isConnected = db.connections[0].readyState
        console.log("Database Connected Successfully")
    } catch (error) {
        console.error("Database Connection Failed", error)
        process.exit(1)
    }

}

 export default dbconnect;