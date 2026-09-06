/**
 * Suite de tests des Security Rules RTDB — verrouille le modèle « un
 * propriétaire par puzzle, la progression ouverte à tous ».
 * Tourne contre l'ÉMULATEUR : `npm run test:rules`.
 *
 * Ce que cette suite PROUVE, dans l'ordre du constat qui l'a motivée
 * (VALEUR.md, V3 — « n'importe qui peut effacer n'importe quel puzzle ») :
 *
 *  1. lecture — `puzzles` n'est plus lisible en bloc ; seule la requête de la
 *     liste publique passe, et un puzzle privé n'y figure pas ;
 *  2. suppression — un autre uid ne peut pas écrire `null` sur un puzzle
 *     qu'il n'a pas créé ; le créateur, si ;
 *  3. champs structurants — nom, grille, visibilité, mot de passe : créateur ;
 *  4. progression — pièces, historique, photos, checkpoints, membres :
 *     tout le monde, connecté ou non. C'est le produit, pas un oubli ;
 *  5. MIGRATION — un puzzle SANS `ownerUid` (les quatre en base au
 *     06/09/2026) garde EXACTEMENT le comportement d'avant, et personne ne
 *     peut se l'approprier après coup ;
 *  6. DÉGRADATION — sans connexion anonyme activée dans la console Firebase,
 *     le client n'a pas d'uid : créer, lire et poser une pièce marchent
 *     toujours.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  ref,
  set,
  get,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  type Database,
} from 'firebase/database';

const OWNER = 'owner-uid';
const STRANGER = 'stranger-uid';

let env: RulesTestEnvironment;

/**
 * `RulesTestContext.database()` de `@firebase/rules-unit-testing` 4.x rend une
 * instance COMPAT (`firebase.database.Database`, cf. son `.d.ts`), là où les
 * fonctions modulaires — `ref`, `get`, `set` — déclarent attendre le `Database`
 * de `@firebase/database`. Le décalage est de TYPES SEULEMENT : `ref()`
 * commence par `getModularInstance(db)`, qui déballe le `_delegate` d'un objet
 * compat (`@firebase/database`, `function ref(db, path)`).
 *
 * La 5.x rend directement le type modulaire, mais exige `firebase ^12` quand
 * cette application est sur `^11` — d'où la 4.x, et cette conversion, écrite
 * UNE fois ici plutôt qu'à chaque appel.
 *
 * Sans le `include` de `rules-tests` dans `tsconfig.node.json`, ce fichier
 * n'était type-vérifié par personne (vitest efface les types sans les lire) :
 * c'est ce `include` qui a fait apparaître le décalage.
 */
const asModular = (d: unknown): Database => d as Database;

/** `null` = client NON authentifié (connexion anonyme absente ou désactivée). */
const db = (uid: string | null): Database =>
  asModular(
    uid
      ? env.authenticatedContext(uid).database()
      : env.unauthenticatedContext().database()
  );

/** Le corps d'un puzzle tel que `createPuzzle` l'écrit. */
const puzzleBody = (over: Record<string, unknown> = {}) => ({
  id: 'CODE',
  schemaVersion: 1,
  name: 'Le phare',
  isPublic: true,
  rows: 10,
  cols: 10,
  totalPieces: 100,
  placedPieces: 0,
  checkpoints: { '1': { id: '1', name: 'Contour fini', completed: false } },
  history: { '0': { timestamp: Date.now(), placedPieces: 0 } },
  ...over,
});

/** Sème un puzzle SANS passer par les règles. */
async function seed(code: string, over: Record<string, unknown> = {}) {
  await env.withSecurityRulesDisabled(ctx =>
    set(
      ref(ctx.database(), `puzzles/${code}`),
      puzzleBody({ id: code, ...over })
    )
  );
}

/** Le puzzle d'AVANT : aucun `ownerUid` (cas des quatre puzzles en base). */
const seedLegacy = (code: string, over: Record<string, unknown> = {}) =>
  seed(code, over);

/** Un puzzle créé depuis la connexion anonyme : `ownerUid` posé. */
const seedOwned = (code: string, over: Record<string, unknown> = {}) =>
  seed(code, { ownerUid: OWNER, ...over });

/** L'écriture d'`updatePieces` : compteur + entrée d'historique, en un lot. */
const placePiece = (d: Database, code: string, placed: number, key: string) =>
  update(ref(d), {
    [`puzzles/${code}/placedPieces`]: placed,
    [`puzzles/${code}/history/${key}`]: {
      timestamp: Date.now(),
      placedPieces: placed,
      pseudo: 'Camille',
    },
  });

beforeAll(async () => {
  const hostPort = (
    process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? '127.0.0.1:9000'
  ).split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-mister-puzzle',
    database: {
      host: hostPort[0],
      port: Number(hostPort[1]),
      rules: readFileSync('database.rules.json', 'utf8'),
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

describe('lecture — plus d’énumération, la liste publique reste servie', () => {
  it('une lecture globale de `puzzles` est refusée, connecté ou non', async () => {
    await seedOwned('PUB1');
    await assertFails(get(ref(db(null), 'puzzles')));
    await assertFails(get(ref(db(STRANGER), 'puzzles')));
  });

  it('la requête de la liste publique passe, SANS le puzzle privé', async () => {
    await seedOwned('PUBLIC1', { isPublic: true, name: 'Public' });
    await seedOwned('PRIVE1', { isPublic: false, name: 'Privé' });

    const snap = await assertSucceeds(
      get(
        query(ref(db(null), 'puzzles'), orderByChild('isPublic'), equalTo(true))
      )
    );
    const codes = Object.keys((snap.val() ?? {}) as Record<string, unknown>);
    expect(codes).toContain('PUBLIC1');
    expect(codes).not.toContain('PRIVE1');
  });

  it('une requête sur un autre champ ne rouvre pas l’arbre', async () => {
    await seedOwned('PUB2');
    await assertFails(
      get(
        query(
          ref(db(null), 'puzzles'),
          orderByChild('name'),
          equalTo('Le phare')
        )
      )
    );
    await assertFails(
      get(
        query(
          ref(db(null), 'puzzles'),
          orderByChild('isPublic'),
          equalTo(false)
        )
      )
    );
  });

  it('un puzzle reste lisible par son code, sans compte — c’est le produit', async () => {
    await seedOwned('LISIBLE');
    await seedOwned('PRIVE2', { isPublic: false });
    await assertSucceeds(get(ref(db(null), 'puzzles/LISIBLE')));
    // Y compris un privé : le code de salle EST la clé d'entrée. Ce qui a
    // disparu, c'est de le trouver sans le connaître.
    await assertSucceeds(get(ref(db(null), 'puzzles/PRIVE2')));
  });
});

describe('suppression — le trou que V3 décrit', () => {
  it('un autre uid ne peut pas écrire `null` sur un puzzle qu’il n’a pas créé', async () => {
    await seedOwned('DEL1');
    await assertFails(remove(ref(db(STRANGER), 'puzzles/DEL1')));
    await assertFails(set(ref(db(STRANGER), 'puzzles/DEL1'), null));
    await assertFails(remove(ref(db(null), 'puzzles/DEL1')));
    await assertFails(update(ref(db(STRANGER)), { 'puzzles/DEL1': null }));
    // Et le puzzle est toujours là.
    const snap = await assertSucceeds(get(ref(db(null), 'puzzles/DEL1')));
    expect(snap.exists()).toBe(true);
  });

  it('le créateur, lui, peut supprimer son puzzle', async () => {
    await seedOwned('DEL2');
    await assertSucceeds(remove(ref(db(OWNER), 'puzzles/DEL2')));
  });

  it('un inconnu ne peut pas non plus le vider champ par champ', async () => {
    await seedOwned('DEL3');
    await assertFails(set(ref(db(STRANGER), 'puzzles/DEL3/name'), null));
    await assertFails(set(ref(db(STRANGER), 'puzzles/DEL3/history'), null));
    await assertFails(set(ref(db(STRANGER), 'puzzles/DEL3/totalPieces'), null));
  });
});

describe('champs structurants — le créateur', () => {
  it('renommer, redimensionner, changer la visibilité ou le mot de passe : refusé aux autres', async () => {
    await seedOwned('STRUCT');
    await assertFails(set(ref(db(STRANGER), 'puzzles/STRUCT/name'), 'Volé'));
    await assertFails(set(ref(db(null), 'puzzles/STRUCT/name'), 'Volé'));
    await assertFails(set(ref(db(STRANGER), 'puzzles/STRUCT/isPublic'), false));
    await assertFails(
      set(ref(db(STRANGER), 'puzzles/STRUCT/passwordHash'), 'a'.repeat(64))
    );
    await assertFails(
      update(ref(db(STRANGER), 'puzzles/STRUCT'), {
        rows: 2,
        cols: 2,
        totalPieces: 4,
      })
    );
  });

  it('le créateur les modifie', async () => {
    await seedOwned('STRUCT2');
    await assertSucceeds(
      set(ref(db(OWNER), 'puzzles/STRUCT2/name'), 'Le phare II')
    );
    await assertSucceeds(
      set(ref(db(OWNER), 'puzzles/STRUCT2/isPublic'), false)
    );
    await assertSucceeds(
      update(ref(db(OWNER), 'puzzles/STRUCT2'), {
        rows: 20,
        cols: 20,
        totalPieces: 400,
      })
    );
  });
});

describe('progression — ouverte à tous, connecté ou non', () => {
  it('un anonyme peut toujours poser une pièce sur le puzzle d’un autre', async () => {
    await seedOwned('JEU');
    await assertSucceeds(placePiece(db(null), 'JEU', 12, 'h-anon'));
    await assertSucceeds(placePiece(db(STRANGER), 'JEU', 30, 'h-inconnu'));
    await assertSucceeds(placePiece(db(OWNER), 'JEU', 31, 'h-owner'));
  });

  it('photos, checkpoints et présence restent partagés', async () => {
    await seedOwned('JEU2');
    await assertSucceeds(
      set(ref(db(null), 'puzzles/JEU2/photos/p1'), {
        data: 'data:image/jpeg;base64,AAAA',
        rotation: 0,
        addedAt: Date.now(),
        sortOrder: 0,
      })
    );
    await assertSucceeds(
      set(ref(db(STRANGER), 'puzzles/JEU2/checkpoints/c1'), {
        id: 'c1',
        name: 'Le ciel',
        completed: false,
      })
    );
    await assertSucceeds(
      set(ref(db(STRANGER), 'puzzles/JEU2/checkpoints/1/completed'), true)
    );
    await assertSucceeds(
      set(ref(db(null), 'puzzles/JEU2/members/s1'), {
        pseudo: 'Camille',
        lastSeen: Date.now(),
      })
    );
  });

  it('la validation de forme tient toujours', async () => {
    await seedOwned('JEU3');
    // plus de pièces posées que de pièces
    await assertFails(set(ref(db(null), 'puzzles/JEU3/placedPieces'), 101));
    // entrée d'historique sans horodatage
    await assertFails(
      set(ref(db(null), 'puzzles/JEU3/history/x'), { placedPieces: 3 })
    );
  });
});

describe('migration — les puzzles d’avant gardent leur comportement', () => {
  it('un puzzle SANS ownerUid reste supprimable et modifiable par quiconque', async () => {
    await seedLegacy('ANCIEN1', { createdBy: 'Camille' });
    await assertSucceeds(set(ref(db(null), 'puzzles/ANCIEN1/name'), 'Renommé'));
    await assertSucceeds(
      set(ref(db(STRANGER), 'puzzles/ANCIEN1/isPublic'), false)
    );
    await assertSucceeds(remove(ref(db(STRANGER), 'puzzles/ANCIEN1')));
  });

  it('mais personne ne se l’approprie après coup', async () => {
    await seedLegacy('ANCIEN2');
    await assertFails(
      set(ref(db(STRANGER), 'puzzles/ANCIEN2/ownerUid'), STRANGER)
    );
    await assertFails(set(ref(db(OWNER), 'puzzles/ANCIEN2/ownerUid'), OWNER));
  });

  it('et le propriétaire d’un puzzle possédé ne peut pas être remplacé', async () => {
    await seedOwned('POSSEDE');
    await assertFails(
      set(ref(db(STRANGER), 'puzzles/POSSEDE/ownerUid'), STRANGER)
    );
    await assertFails(remove(ref(db(STRANGER), 'puzzles/POSSEDE/ownerUid')));
  });
});

describe('création — et la dégradation si la connexion anonyme est absente', () => {
  it('un client connecté crée un puzzle qui lui appartient', async () => {
    await assertSucceeds(
      set(
        ref(db(OWNER), 'puzzles/NEUF1'),
        puzzleBody({ id: 'NEUF1', ownerUid: OWNER, createdBy: 'Camille' })
      )
    );
    await assertFails(remove(ref(db(STRANGER), 'puzzles/NEUF1')));
    await assertSucceeds(remove(ref(db(OWNER), 'puzzles/NEUF1')));
  });

  it('on ne peut pas créer un puzzle au nom d’un autre', async () => {
    await assertFails(
      set(
        ref(db(STRANGER), 'puzzles/NEUF2'),
        puzzleBody({ id: 'NEUF2', ownerUid: OWNER })
      )
    );
    await assertFails(
      set(
        ref(db(null), 'puzzles/NEUF3'),
        puzzleBody({ id: 'NEUF3', ownerUid: OWNER })
      )
    );
  });

  it('sans connexion anonyme activée, la création marche toujours — sans propriétaire', async () => {
    // C'est le comportement d'un client dont `signInAnonymously` a échoué
    // (`auth/operation-not-allowed` tant que le propriétaire n'a pas coché la
    // case dans la console Firebase) : pas d'uid, donc pas d'`ownerUid`.
    await assertSucceeds(
      set(ref(db(null), 'puzzles/NEUF4'), puzzleBody({ id: 'NEUF4' }))
    );
    await assertSucceeds(placePiece(db(null), 'NEUF4', 5, 'h1'));
    await assertSucceeds(get(ref(db(null), 'puzzles/NEUF4')));
  });
});
