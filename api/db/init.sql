CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Player',
    total_stars INTEGER NOT NULL DEFAULT 0,
    max_combo INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    artist TEXT NOT NULL,
    bpm INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    audio_file TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS song_difficulties (
    id TEXT PRIMARY KEY,
    song_id TEXT NOT NULL REFERENCES songs(id),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'normal', 'hard', 'expert')),
    stars INTEGER NOT NULL,
    note_speed REAL NOT NULL DEFAULT 1.0,
    special_modes TEXT,
    unlock_requirement INTEGER NOT NULL DEFAULT 0,
    UNIQUE(song_id, difficulty)
);

CREATE TABLE IF NOT EXISTS game_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    song_id TEXT NOT NULL REFERENCES songs(id),
    difficulty TEXT NOT NULL,
    score INTEGER NOT NULL,
    accuracy REAL NOT NULL,
    max_combo INTEGER NOT NULL,
    grade TEXT NOT NULL CHECK (grade IN ('S', 'A', 'B', 'C', 'D')),
    perfect_count INTEGER NOT NULL DEFAULT 0,
    great_count INTEGER NOT NULL DEFAULT 0,
    good_count INTEGER NOT NULL DEFAULT 0,
    miss_count INTEGER NOT NULL DEFAULT 0,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unlocked_songs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    song_id TEXT NOT NULL REFERENCES songs(id),
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_game_records_user_song ON game_records(user_id, song_id);
CREATE INDEX IF NOT EXISTS idx_game_records_score ON game_records(score DESC);

INSERT OR IGNORE INTO songs (id, name, artist, bpm, duration) VALUES
('song_001', 'Starter Beat', 'Rhythm Master', 120, 60000),
('song_002', 'Neon Pulse', 'Cyber DJ', 140, 90000),
('song_003', 'Digital Dreams', 'Synth Wave', 128, 75000),
('song_004', 'Velocity', 'Speed Runner', 160, 85000),
('song_005', 'Infinity', 'Master Composer', 180, 120000);

INSERT OR IGNORE INTO song_difficulties (id, song_id, difficulty, stars, note_speed, special_modes, unlock_requirement) VALUES
('diff_001_1', 'song_001', 'easy', 1, 1.0, NULL, 0),
('diff_001_2', 'song_001', 'normal', 2, 1.2, NULL, 0),
('diff_001_3', 'song_001', 'hard', 4, 1.5, '["speedUp"]', 3),
('diff_002_1', 'song_002', 'easy', 2, 1.1, NULL, 2),
('diff_002_2', 'song_002', 'normal', 3, 1.3, NULL, 2),
('diff_002_3', 'song_002', 'hard', 5, 1.6, '["hidden"]', 5),
('diff_003_1', 'song_003', 'easy', 2, 1.1, NULL, 4),
('diff_003_2', 'song_003', 'normal', 4, 1.4, NULL, 4),
('diff_003_3', 'song_003', 'hard', 6, 1.7, '["speedUp"]', 8),
('diff_003_4', 'song_003', 'expert', 8, 2.0, '["speedUp","hidden"]', 10),
('diff_004_1', 'song_004', 'normal', 5, 1.5, NULL, 8),
('diff_004_2', 'song_004', 'hard', 7, 1.8, '["hidden"]', 12),
('diff_004_3', 'song_004', 'expert', 9, 2.2, '["speedUp","hidden"]', 15),
('diff_005_1', 'song_005', 'hard', 8, 2.0, '["speedUp"]', 18),
('diff_005_2', 'song_005', 'expert', 10, 2.5, '["speedUp","hidden","shuffle"]', 25);

INSERT OR IGNORE INTO users (id, name) VALUES ('default_user', 'Player 1');

INSERT OR IGNORE INTO unlocked_songs (user_id, song_id) VALUES
('default_user', 'song_001'),
('default_user', 'song_002');
