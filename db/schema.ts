import mongoose, { Schema, Document } from "mongoose";

// --- Users ---
const userSchema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  imageUrl: { type: String },
  subscriptionTier: { type: String, default: "free", required: true },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

export const User = mongoose.models.User || mongoose.model("User", userSchema);

// --- Communities ---
const communitySchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

export const Community = mongoose.models.Community || mongoose.model("Community", communitySchema);

// --- Community Members ---
const communityMemberSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  communityId: { type: Schema.Types.ObjectId, ref: "Community", required: true },
  joinedAt: { type: Date, default: Date.now },
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

export const CommunityMember = mongoose.models.CommunityMember || mongoose.model("CommunityMember", communityMemberSchema);

// --- Learning Goals ---
const learningGoalSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  communityId: { type: Schema.Types.ObjectId, ref: "Community", required: true },
  title: { type: String, required: true },
  description: { type: String },
  tags: { type: [String], default: [] },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

export const LearningGoal = mongoose.models.LearningGoal || mongoose.model("LearningGoal", learningGoalSchema);

// --- Matches ---
const matchSchema = new Schema({
  user1Id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  user2Id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  communityId: { type: Schema.Types.ObjectId, ref: "Community", required: true },
  status: { type: String, default: "pending", required: true }, // pending, accepted, declined
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

matchSchema.index({ user1Id: 1, user2Id: 1, communityId: 1 }, { unique: true });

export const Match = mongoose.models.Match || mongoose.model("Match", matchSchema);

// --- Conversations ---
const conversationSchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true },
  lastMessageAt: { type: Date },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

export const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);

// --- Messages ---
const messageSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

export const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

// --- Conversation Summaries ---
const conversationSummarySchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
  summary: { type: String, required: true },
  actionItems: { type: [String], default: [] },
  keyPoints: { type: [String], default: [] },
  nextSteps: { type: [String], default: [] },
  generatedAt: { type: Date, default: Date.now },
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

export const ConversationSummary = mongoose.models.ConversationSummary || mongoose.model("ConversationSummary", conversationSummarySchema);



// 1. npx drizzle-kit push
