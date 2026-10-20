/**
 * Client-side classes equivalent to the MongoDB documents.
 * Each class wraps the JSON returned by the REST API and adds derived properties.
 */
import { age, formatDate } from '../pipes';

const idOf = (v) => (v && typeof v === 'object' ? v._id : v || '');

export class User {
  constructor(json = {}) {
    this._id = json._id;
    this.username = json.username || '';
    this.email = json.email || '';
    this.fullName = json.fullName || '';
    this.country = json.country || '';
    this.role = json.role || 'user';
    this.emailNotifications = json.emailNotifications ?? true;
    this.predictionCount = json.predictionCount ?? 0;
    this.points = json.points ?? 0;
    this.createdAt = json.createdAt ? new Date(json.createdAt) : null;
  }
  get isAdmin() { return this.role === 'admin'; }
  get displayName() { return this.fullName || this.username; }
}

export class Club {
  constructor(json = {}) {
    this._id = json._id;
    this.name = json.name || '';
    this.city = json.city || '';
    this.country = json.country || '';
    this.league = json.league || '';
    this.founded = json.founded ?? '';
    this.arena = json.arena || '';
    this.logoUrl = json.logoUrl || '';
    this.externalId = json.externalId || null;
    this.playerCount = json.playerCount ?? 0;
    this.players = (json.players || []).map((p) => new Player(p));
    this.standing = json.standing || null; // place in the league table (club details)
  }
  toPayload() {
    const { name, city, country, league, founded, arena, logoUrl } = this;
    return {
      name: name.trim(), city: city.trim(), country: country.trim(), league, arena,
      founded: founded === '' ? undefined : Number(founded), logoUrl: logoUrl.trim(),
    };
  }
}

export class Player {
  constructor(json = {}) {
    this._id = json._id;
    this.firstName = json.firstName || '';
    this.lastName = json.lastName || '';
    this.dateOfBirth = json.dateOfBirth ? String(json.dateOfBirth).slice(0, 10) : '';
    this.nationality = json.nationality || '';
    this.position = json.position || '';
    this.jerseyNumber = json.jerseyNumber ?? '';
    this.hand = json.hand || 'right';
    this.heightCm = json.heightCm ?? '';
    this.club = json.club && typeof json.club === 'object' ? new Club(json.club) : null;
    this.clubId = idOf(json.club);
    this.photoUrl = json.photoUrl || '';
    this.notes = json.notes || '';
    this.bio = json.bio || '';
    this.externalId = json.externalId || null;
    this.createdBy = idOf(json.createdBy) || null;
    // season statistics computed by the server
    this.appearances = json.appearances ?? 0;
    this.goals = json.goals ?? 0;
    this.shots = json.shots ?? 0;
    this.saves = json.saves ?? 0;
    this.updatedAt = json.updatedAt ? new Date(json.updatedAt) : null;
  }
  get fullName() { return `${this.firstName} ${this.lastName}`.trim(); }
  get age() { return age(this.dateOfBirth); }
  get isGoalkeeper() { return this.position === 'GK'; }
  get photo() { return this.photoUrl || `https://ui-avatars.com/api/?size=512&background=13315c&color=fff&name=${encodeURIComponent(this.fullName)}`; }
  toPayload() {
    const num = (v) => (v === '' || v == null ? undefined : Number(v));
    return {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      dateOfBirth: this.dateOfBirth,
      nationality: this.nationality.trim(),
      position: this.position,
      jerseyNumber: num(this.jerseyNumber),
      hand: this.hand,
      heightCm: num(this.heightCm),
      club: this.clubId || '', // '' -> server removes the club (free agent)
      photoUrl: this.photoUrl.trim(),
      notes: this.notes,
    };
  }
}

export class Match {
  constructor(json = {}) {
    this._id = json._id;
    this.homeClub = json.homeClub && typeof json.homeClub === 'object' ? new Club(json.homeClub) : null;
    this.awayClub = json.awayClub && typeof json.awayClub === 'object' ? new Club(json.awayClub) : null;
    this.homeClubId = idOf(json.homeClub);
    this.awayClubId = idOf(json.awayClub);
    this.date = json.date ? new Date(json.date) : null;
    this.competition = json.competition || '';
    this.round = json.round ?? '';
    this.venue = json.venue || '';
    this.status = json.status || 'scheduled';
    this.homeScore = json.homeScore ?? null;
    this.awayScore = json.awayScore ?? null;
    this.performances = (json.performances || []).map((p) => ({
      ...p,
      player: p.player && typeof p.player === 'object' ? new Player(p.player) : p.player,
    }));
    this.predictionCount = json.predictionCount ?? 0;
    this.commentCount = json.commentCount ?? 0;
    this.predictionSummary = json.predictionSummary || null;
  }
  get isFinished() { return this.status === 'finished'; }
  /** predictions are accepted until kick-off */
  get isOpen() { return this.status === 'scheduled' && this.date > new Date(); }
  get score() { return this.isFinished ? `${this.homeScore}:${this.awayScore}` : '–:–'; }
  get title() { return `${this.homeClub?.name || '?'} ${this.isFinished ? this.score : '–'} ${this.awayClub?.name || '?'}`; }
  get winner() {
    if (!this.isFinished) return null;
    return this.homeScore > this.awayScore ? 'home' : this.homeScore < this.awayScore ? 'away' : 'draw';
  }
  /** player statistics of one side (home / away) – by the club stored in the performance */
  side(which) {
    const clubId = which === 'home' ? this.homeClubId : this.awayClubId;
    return this.performances.filter((p) => p.player && String(p.club || p.player.clubId) === String(clubId));
  }
  toPayload() {
    return {
      homeClub: this.homeClubId,
      awayClub: this.awayClubId,
      date: this.date ? new Date(this.date).toISOString() : '',
      competition: this.competition.trim(),
      round: this.round === '' ? undefined : Number(this.round),
      venue: this.venue,
    };
  }
}

export class Prediction {
  constructor(json = {}) {
    this._id = json._id;
    this.user = json.user && typeof json.user === 'object' ? new User(json.user) : null;
    this.userId = idOf(json.user);
    this.match = json.match && typeof json.match === 'object' ? new Match(json.match) : null;
    this.matchId = idOf(json.match);
    this.homeScore = json.homeScore ?? '';
    this.awayScore = json.awayScore ?? '';
    this.note = json.note || '';
    this.points = json.points ?? null;
    this.createdAt = json.createdAt ? new Date(json.createdAt) : null;
  }
  get scoreline() { return `${this.homeScore}:${this.awayScore}`; }
  get isScored() { return this.points != null; }
  get when() { return formatDate(this.createdAt); }
  toPayload() {
    return { match: this.matchId, homeScore: Number(this.homeScore), awayScore: Number(this.awayScore), note: this.note.trim() };
  }
}

export class Comment {
  constructor(json = {}) {
    this._id = json._id;
    this.match = json.match;
    this.author = json.author && typeof json.author === 'object' ? new User(json.author) : null;
    this.text = json.text || '';
    this.createdAt = json.createdAt ? new Date(json.createdAt) : null;
    this.updatedAt = json.updatedAt ? new Date(json.updatedAt) : null;
  }
  get edited() { return this.updatedAt && this.createdAt && this.updatedAt - this.createdAt > 1000; }
}

export class Activity {
  constructor(json = {}) {
    this._id = json._id;
    this.user = json.user && typeof json.user === 'object' ? new User(json.user) : null;
    this.action = json.action;
    this.entityType = json.entityType;
    this.entityId = json.entityId;
    this.description = json.description || '';
    this.createdAt = json.createdAt ? new Date(json.createdAt) : null;
  }
  get link() {
    const map = { Player: '/players/', Match: '/matches/', Club: '/clubs/' };
    return this.action !== 'delete' && map[this.entityType] && this.entityId ? map[this.entityType] + this.entityId : null;
  }
}

/** Wrap a paginated API response */
export const toPage = (json, Cls) => ({ ...json, items: (json.items || []).map((i) => new Cls(i)) });
