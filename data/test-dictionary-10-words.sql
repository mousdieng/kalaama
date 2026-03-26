-- Test Dictionary Data: 10 Common A1 German Words
-- Insert this data to test the dictionary system

INSERT INTO public.german_french_dictionary (
    word, article, gender, part_of_speech, difficulty_level,
    french_translation, french_definition, french_explanation,
    pronunciation_ipa, context_usage, examples, synonyms, antonyms, collocations,
    plural_form, conjugation_hint, frequency_rank
) VALUES

-- 1. Haus (house)
(
    'Haus', 'das', 'n', 'noun', 'A1',
    'maison',
    'Bâtiment d''habitation où les gens vivent.',
    'Attention: "das Haus", pas "der Haus". Le genre est différent du français (la maison).',
    '/haʊs/',
    'Utilisé pour parler de résidences, propriétés, ou lieux d''habitation',
    '[
        {"german": "Das Haus ist groß.", "french": "La maison est grande.", "level": "A1"},
        {"german": "Ich wohne in einem großen Haus.", "french": "J''habite dans une grande maison.", "level": "A1"},
        {"german": "Das Haus hat drei Zimmer.", "french": "La maison a trois pièces.", "level": "A1"},
        {"german": "Mein Haus ist am Ende der Straße.", "french": "Ma maison est au bout de la rue.", "level": "A2"},
        {"german": "Sie kaufen ein neues Haus.", "french": "Ils achètent une nouvelle maison.", "level": "A2"},
        {"german": "Das alte Haus wurde renoviert.", "french": "La vieille maison a été rénovée.", "level": "B1"},
        {"german": "Wir bauen ein Haus auf dem Land.", "french": "Nous construisons une maison à la campagne.", "level": "A2"},
        {"german": "In unserem Haus gibt es einen Garten.", "french": "Dans notre maison, il y a un jardin.", "level": "A2"},
        {"german": "Kommst du heute zu meinem Haus?", "french": "Tu viens chez moi aujourd''hui ?", "level": "A1"},
        {"german": "Das Haus steht zum Verkauf.", "french": "La maison est à vendre.", "level": "B1"},
        {"german": "Wir haben das Haus vor fünf Jahren gekauft.", "french": "Nous avons acheté la maison il y a cinq ans.", "level": "B1"},
        {"german": "Meine Großeltern leben in einem kleinen Haus.", "french": "Mes grands-parents vivent dans une petite maison.", "level": "A2"}
    ]'::jsonb,
    ARRAY['Gebäude', 'Wohnung', 'Heim'],
    ARRAY[]::TEXT[],
    '[
        {"phrase": "nach Hause gehen", "french": "rentrer à la maison"},
        {"phrase": "zu Hause bleiben", "french": "rester à la maison"},
        {"phrase": "zu Hause sein", "french": "être à la maison"}
    ]'::jsonb,
    'Häuser',
    NULL,
    1
),

-- 2. lernen (to learn)
(
    'lernen', NULL, NULL, 'verb', 'A1',
    'apprendre',
    'Acquérir des connaissances ou des compétences par l''étude ou l''expérience.',
    'Verbe régulier très commun. Ne pas confondre avec "lehren" (enseigner).',
    '/ˈlɛʁnən/',
    'Utilisé dans des contextes éducatifs, d''apprentissage de langues, ou d''acquisition de nouvelles compétences',
    '[
        {"german": "Ich lerne Deutsch.", "french": "J''apprends l''allemand.", "level": "A1"},
        {"german": "Sie lernt jeden Tag neue Wörter.", "french": "Elle apprend de nouveaux mots chaque jour.", "level": "A1"},
        {"german": "Wir haben viel für die Prüfung gelernt.", "french": "Nous avons beaucoup étudié pour l''examen.", "level": "A2"},
        {"german": "Er lernt Gitarre spielen.", "french": "Il apprend à jouer de la guitare.", "level": "A2"},
        {"german": "Kinder lernen schnell.", "french": "Les enfants apprennent vite.", "level": "A1"},
        {"german": "Ich muss noch viel lernen.", "french": "Je dois encore apprendre beaucoup.", "level": "A2"},
        {"german": "Hast du für den Test gelernt?", "french": "As-tu étudié pour le test ?", "level": "A1"},
        {"german": "Sie lernt seit drei Jahren Französisch.", "french": "Elle apprend le français depuis trois ans.", "level": "B1"},
        {"german": "Man lernt aus seinen Fehlern.", "french": "On apprend de ses erreurs.", "level": "B1"},
        {"german": "Wir lernen zusammen in der Bibliothek.", "french": "Nous étudions ensemble à la bibliothèque.", "level": "A2"},
        {"german": "Es ist nie zu spät, etwas Neues zu lernen.", "french": "Il n''est jamais trop tard pour apprendre quelque chose de nouveau.", "level": "B2"},
        {"german": "Die Schüler lernen Mathematik und Geschichte.", "french": "Les élèves apprennent les mathématiques et l''histoire.", "level": "A2"}
    ]'::jsonb,
    ARRAY['studieren', 'büffeln'],
    ARRAY['vergessen', 'verlernen'],
    '[
        {"phrase": "auswendig lernen", "french": "apprendre par cœur"},
        {"phrase": "Deutsch lernen", "french": "apprendre l''allemand"}
    ]'::jsonb,
    NULL,
    'ich lerne, du lernst, er/sie/es lernt',
    2
),

-- 3. schnell (fast)
(
    'schnell', NULL, NULL, 'adjective', 'A1',
    'rapide',
    'Qui se déplace, agit ou se produit à grande vitesse.',
    'Peut être utilisé comme adjectif ou adverbe. Très fréquent dans la langue quotidienne.',
    '/ʃnɛl/',
    'Pour décrire la vitesse d''action, de mouvement ou de processus',
    '[
        {"german": "Das Auto fährt schnell.", "french": "La voiture roule vite.", "level": "A1"},
        {"german": "Bitte sprich langsamer, du redest zu schnell!", "french": "Parle plus lentement s''il te plaît, tu parles trop vite !", "level": "A2"},
        {"german": "Sie ist eine schnelle Läuferin.", "french": "Elle est une coureuse rapide.", "level": "A2"},
        {"german": "Ich muss schnell zur Arbeit gehen.", "french": "Je dois aller vite au travail.", "level": "A1"},
        {"german": "Die Zeit vergeht schnell.", "french": "Le temps passe vite.", "level": "A2"},
        {"german": "Er hat schnell eine Lösung gefunden.", "french": "Il a trouvé une solution rapidement.", "level": "B1"},
        {"german": "Wie schnell kannst du laufen?", "french": "À quelle vitesse peux-tu courir ?", "level": "A2"},
        {"german": "Mach schnell, wir haben keine Zeit!", "french": "Fais vite, nous n''avons pas de temps !", "level": "A1"},
        {"german": "Das Internet ist hier sehr schnell.", "french": "Internet est très rapide ici.", "level": "A2"},
        {"german": "Sie lernt Sprachen schneller als ich.", "french": "Elle apprend les langues plus vite que moi.", "level": "B1"},
        {"german": "Der schnellste Weg ist über die Autobahn.", "french": "Le chemin le plus rapide passe par l''autoroute.", "level": "B1"},
        {"german": "Kannst du mir schnell helfen?", "french": "Peux-tu m''aider rapidement ?", "level": "A1"}
    ]'::jsonb,
    ARRAY['rasch', 'zügig', 'flink'],
    ARRAY['langsam', 'träge'],
    '[
        {"phrase": "so schnell wie möglich", "french": "aussi vite que possible"},
        {"phrase": "schnell machen", "french": "se dépêcher"}
    ]'::jsonb,
    NULL,
    NULL,
    3
),

-- 4. aber (but)
(
    'aber', NULL, NULL, 'conjunction', 'A1',
    'mais',
    'Conjonction de coordination exprimant une opposition ou une restriction.',
    'Mot de liaison très fréquent. Toujours en début de proposition.',
    '/ˈaːbɐ/',
    'Utilisé pour introduire un contraste ou une objection',
    '[
        {"german": "Ich bin müde, aber ich muss arbeiten.", "french": "Je suis fatigué, mais je dois travailler.", "level": "A1"},
        {"german": "Das ist teuer, aber es lohnt sich.", "french": "C''est cher, mais ça vaut le coup.", "level": "A2"},
        {"german": "Er wollte kommen, aber er hatte keine Zeit.", "french": "Il voulait venir, mais il n''avait pas le temps.", "level": "A1"},
        {"german": "Das Wetter ist schlecht, aber wir gehen trotzdem spazieren.", "french": "Le temps est mauvais, mais nous allons quand même nous promener.", "level": "A2"},
        {"german": "Sie spricht gut Deutsch, aber mit Akzent.", "french": "Elle parle bien allemand, mais avec un accent.", "level": "B1"},
        {"german": "Ich verstehe dich, aber ich bin nicht einverstanden.", "french": "Je te comprends, mais je ne suis pas d''accord.", "level": "B1"},
        {"german": "Das ist richtig, aber nicht vollständig.", "french": "C''est correct, mais pas complet.", "level": "B1"},
        {"german": "Ich mag Kaffee, aber ich trinke lieber Tee.", "french": "J''aime le café, mais je préfère boire du thé.", "level": "A2"},
        {"german": "Das Buch ist lang, aber sehr interessant.", "french": "Le livre est long, mais très intéressant.", "level": "A2"},
        {"german": "Er ist jung, aber sehr erfahren.", "french": "Il est jeune, mais très expérimenté.", "level": "B1"},
        {"german": "Ich habe es versucht, aber es hat nicht geklappt.", "french": "J''ai essayé, mais ça n''a pas marché.", "level": "A2"},
        {"german": "Das Restaurant ist klein, aber gemütlich.", "french": "Le restaurant est petit, mais confortable.", "level": "A2"}
    ]'::jsonb,
    ARRAY['jedoch', 'doch', 'allerdings'],
    ARRAY[]::TEXT[],
    '[]'::jsonb,
    NULL,
    NULL,
    4
),

-- 5. Freund (friend)
(
    'Freund', 'der', 'm', 'noun', 'A1',
    'ami',
    'Personne avec qui on a une relation amicale.',
    'Peut aussi signifier "petit ami" selon le contexte. Féminin: Freundin.',
    '/fʁɔʏnt/',
    'Relations personnelles, amitié',
    '[
        {"german": "Er ist mein bester Freund.", "french": "C''est mon meilleur ami.", "level": "A1"},
        {"german": "Ich treffe meine Freunde am Wochenende.", "french": "Je rencontre mes amis le week-end.", "level": "A1"},
        {"german": "Das ist der Freund meiner Schwester.", "french": "C''est le petit ami de ma sœur.", "level": "A2"},
        {"german": "Wir sind seit zehn Jahren Freunde.", "french": "Nous sommes amis depuis dix ans.", "level": "A2"},
        {"german": "Hast du viele Freunde?", "french": "As-tu beaucoup d''amis ?", "level": "A1"},
        {"german": "Ein guter Freund hilft immer.", "french": "Un bon ami aide toujours.", "level": "A2"},
        {"german": "Ich gehe mit meinem Freund ins Kino.", "french": "Je vais au cinéma avec mon ami.", "level": "A1"},
        {"german": "Ihre Freunde kommen zur Party.", "french": "Ses amis viennent à la fête.", "level": "A1"},
        {"german": "Er hat einen neuen Freund kennengelernt.", "french": "Il a rencontré un nouvel ami.", "level": "A2"},
        {"german": "Meine Freunde sprechen alle Deutsch.", "french": "Mes amis parlent tous allemand.", "level": "A2"},
        {"german": "Ein Freund in der Not ist ein Freund in der Tat.", "french": "C''est dans le besoin qu''on reconnaît ses vrais amis.", "level": "B2"},
        {"german": "Wir sind nicht nur Kollegen, sondern auch Freunde.", "french": "Nous ne sommes pas seulement des collègues, mais aussi des amis.", "level": "B1"}
    ]'::jsonb,
    ARRAY['Kamerad', 'Kumpel'],
    ARRAY['Feind', 'Gegner'],
    '[
        {"phrase": "ein guter Freund", "french": "un bon ami"},
        {"phrase": "beste Freunde", "french": "meilleurs amis"}
    ]'::jsonb,
    'Freunde',
    NULL,
    5
),

-- 6. gut (good)
(
    'gut', NULL, NULL, 'adjective', 'A1',
    'bon',
    'De qualité satisfaisante, qui répond aux attentes.',
    'Comparatif: besser (meilleur). Superlatif: am besten (le meilleur).',
    '/ɡuːt/',
    'Évaluation positive, qualité, compétence',
    '[
        {"german": "Das Essen ist gut.", "french": "La nourriture est bonne.", "level": "A1"},
        {"german": "Sie spricht gut Deutsch.", "french": "Elle parle bien allemand.", "level": "A1"},
        {"german": "Guten Tag!", "french": "Bonjour !", "level": "A1"},
        {"german": "Das ist eine gute Idee.", "french": "C''est une bonne idée.", "level": "A1"},
        {"german": "Ich fühle mich gut.", "french": "Je me sens bien.", "level": "A2"},
        {"german": "Er ist ein guter Lehrer.", "french": "C''est un bon professeur.", "level": "A1"},
        {"german": "Wie geht es dir? - Gut, danke!", "french": "Comment vas-tu ? - Bien, merci !", "level": "A1"},
        {"german": "Das Wetter ist heute gut.", "french": "Le temps est beau aujourd''hui.", "level": "A1"},
        {"german": "Sie hat eine gute Note bekommen.", "french": "Elle a eu une bonne note.", "level": "A2"},
        {"german": "Ich habe einen guten Job gefunden.", "french": "J''ai trouvé un bon travail.", "level": "A2"},
        {"german": "Das ist gut zu wissen.", "french": "C''est bon à savoir.", "level": "B1"},
        {"german": "Alles Gute zum Geburtstag!", "french": "Joyeux anniversaire !", "level": "A1"}
    ]'::jsonb,
    ARRAY['schön', 'prima', 'fein'],
    ARRAY['schlecht', 'böse'],
    '[
        {"phrase": "gute Nacht", "french": "bonne nuit"},
        {"phrase": "guten Morgen", "french": "bonjour (le matin)"},
        {"phrase": "alles Gute", "french": "bonne chance"}
    ]'::jsonb,
    NULL,
    NULL,
    6
),

-- 7. haben (to have)
(
    'haben', NULL, NULL, 'verb', 'A1',
    'avoir',
    'Posséder quelque chose, verbe auxiliaire pour le passé composé.',
    'Verbe irrégulier essentiel. Conjugaison: ich habe, du hast, er/sie/es hat.',
    '/ˈhaːbən/',
    'Possession, états, formation du passé composé',
    '[
        {"german": "Ich habe ein Auto.", "french": "J''ai une voiture.", "level": "A1"},
        {"german": "Hast du Zeit?", "french": "As-tu le temps ?", "level": "A1"},
        {"german": "Sie hat zwei Kinder.", "french": "Elle a deux enfants.", "level": "A1"},
        {"german": "Wir haben Hunger.", "french": "Nous avons faim.", "level": "A1"},
        {"german": "Er hat Geburtstag.", "french": "C''est son anniversaire.", "level": "A1"},
        {"german": "Ich habe keine Ahnung.", "french": "Je n''ai aucune idée.", "level": "A2"},
        {"german": "Habt ihr Geschwister?", "french": "Avez-vous des frères et sœurs ?", "level": "A1"},
        {"german": "Sie haben ein großes Haus gekauft.", "french": "Ils ont acheté une grande maison.", "level": "A2"},
        {"german": "Ich habe gestern viel gearbeitet.", "french": "J''ai beaucoup travaillé hier.", "level": "A2"},
        {"german": "Wir haben Glück gehabt.", "french": "Nous avons eu de la chance.", "level": "B1"},
        {"german": "Er hat Recht.", "french": "Il a raison.", "level": "A2"},
        {"german": "Haben Sie schon bestellt?", "french": "Avez-vous déjà commandé ?", "level": "A2"}
    ]'::jsonb,
    ARRAY['besitzen', 'verfügen'],
    ARRAY[]::TEXT[],
    '[
        {"phrase": "Hunger haben", "french": "avoir faim"},
        {"phrase": "Durst haben", "french": "avoir soif"},
        {"phrase": "Zeit haben", "french": "avoir le temps"},
        {"phrase": "Recht haben", "french": "avoir raison"}
    ]'::jsonb,
    NULL,
    'ich habe, du hast, er/sie/es hat',
    7
),

-- 8. sein (to be)
(
    'sein', NULL, NULL, 'verb', 'A1',
    'être',
    'Verbe d''état fondamental, verbe auxiliaire pour le passé composé.',
    'Verbe irrégulier le plus important. Conjugaison: ich bin, du bist, er/sie/es ist.',
    '/zaɪn/',
    'État, identité, localisation, formation du passé composé',
    '[
        {"german": "Ich bin müde.", "french": "Je suis fatigué.", "level": "A1"},
        {"german": "Wo bist du?", "french": "Où es-tu ?", "level": "A1"},
        {"german": "Er ist Lehrer.", "french": "Il est professeur.", "level": "A1"},
        {"german": "Wir sind aus Frankreich.", "french": "Nous sommes de France.", "level": "A1"},
        {"german": "Das ist mein Freund.", "french": "C''est mon ami.", "level": "A1"},
        {"german": "Sie sind sehr nett.", "french": "Ils sont très gentils.", "level": "A1"},
        {"german": "Ich bin 25 Jahre alt.", "french": "J''ai 25 ans.", "level": "A1"},
        {"german": "Ist das dein Auto?", "french": "Est-ce ta voiture ?", "level": "A1"},
        {"german": "Wir sind gestern angekommen.", "french": "Nous sommes arrivés hier.", "level": "A2"},
        {"german": "Sie ist Ärztin geworden.", "french": "Elle est devenue médecin.", "level": "B1"},
        {"german": "Das ist nicht fair!", "french": "Ce n''est pas juste !", "level": "A2"},
        {"german": "Seid ihr bereit?", "french": "Êtes-vous prêts ?", "level": "A2"}
    ]'::jsonb,
    ARRAY['existieren'],
    ARRAY[]::TEXT[],
    '[
        {"phrase": "müde sein", "french": "être fatigué"},
        {"phrase": "zu Hause sein", "french": "être à la maison"},
        {"phrase": "fertig sein", "french": "être prêt"}
    ]'::jsonb,
    NULL,
    'ich bin, du bist, er/sie/es ist',
    8
),

-- 9. gehen (to go/walk)
(
    'gehen', NULL, NULL, 'verb', 'A1',
    'aller',
    'Se déplacer d''un lieu à un autre, généralement à pied.',
    'Verbe très courant. Ne pas confondre avec "fahren" (aller en véhicule).',
    '/ˈɡeːən/',
    'Déplacement, mouvement',
    '[
        {"german": "Ich gehe zur Schule.", "french": "Je vais à l''école.", "level": "A1"},
        {"german": "Wohin gehst du?", "french": "Où vas-tu ?", "level": "A1"},
        {"german": "Wir gehen spazieren.", "french": "Nous allons nous promener.", "level": "A1"},
        {"german": "Sie geht jeden Tag joggen.", "french": "Elle va courir tous les jours.", "level": "A2"},
        {"german": "Gehen Sie geradeaus.", "french": "Allez tout droit.", "level": "A1"},
        {"german": "Ich gehe früh ins Bett.", "french": "Je vais me coucher tôt.", "level": "A2"},
        {"german": "Wie geht es dir?", "french": "Comment vas-tu ?", "level": "A1"},
        {"german": "Wir gehen heute Abend ins Kino.", "french": "Nous allons au cinéma ce soir.", "level": "A1"},
        {"german": "Er ist nach Hause gegangen.", "french": "Il est rentré à la maison.", "level": "A2"},
        {"german": "Geht das?", "french": "C''est possible ?", "level": "A2"},
        {"german": "Die Tür geht nicht auf.", "french": "La porte ne s''ouvre pas.", "level": "B1"},
        {"german": "Es geht mir gut.", "french": "Je vais bien.", "level": "A1"}
    ]'::jsonb,
    ARRAY['laufen', 'wandern'],
    ARRAY['bleiben', 'stehen'],
    '[
        {"phrase": "spazieren gehen", "french": "se promener"},
        {"phrase": "nach Hause gehen", "french": "rentrer à la maison"},
        {"phrase": "einkaufen gehen", "french": "aller faire les courses"}
    ]'::jsonb,
    NULL,
    'ich gehe, du gehst, er/sie/es geht',
    9
),

-- 10. kommen (to come)
(
    'kommen', NULL, NULL, 'verb', 'A1',
    'venir',
    'Se déplacer vers un lieu, arriver.',
    'Verbe de mouvement très fréquent. Origine: woher kommst du? (d''où viens-tu?)',
    '/ˈkɔmən/',
    'Mouvement vers le locuteur, origine, arrivée',
    '[
        {"german": "Ich komme aus Deutschland.", "french": "Je viens d''Allemagne.", "level": "A1"},
        {"german": "Kommst du mit?", "french": "Tu viens avec moi ?", "level": "A1"},
        {"german": "Er kommt später.", "french": "Il vient plus tard.", "level": "A1"},
        {"german": "Woher kommen Sie?", "french": "D''où venez-vous ?", "level": "A1"},
        {"german": "Wir kommen gleich.", "french": "Nous arrivons tout de suite.", "level": "A1"},
        {"german": "Sie ist gestern angekommen.", "french": "Elle est arrivée hier.", "level": "A2"},
        {"german": "Komm her!", "french": "Viens ici !", "level": "A1"},
        {"german": "Der Bus kommt in 5 Minuten.", "french": "Le bus arrive dans 5 minutes.", "level": "A2"},
        {"german": "Ich komme nicht mit.", "french": "Je ne viens pas.", "level": "A1"},
        {"german": "Das kommt darauf an.", "french": "Ça dépend.", "level": "B1"},
        {"german": "Wie komme ich zum Bahnhof?", "french": "Comment puis-je aller à la gare ?", "level": "A2"},
        {"german": "Er ist zu spät gekommen.", "french": "Il est arrivé en retard.", "level": "A2"}
    ]'::jsonb,
    ARRAY['ankommen', 'erscheinen'],
    ARRAY['gehen', 'weggehen'],
    '[
        {"phrase": "nach Hause kommen", "french": "rentrer à la maison"},
        {"phrase": "zu spät kommen", "french": "arriver en retard"},
        {"phrase": "mitkommen", "french": "venir avec"}
    ]'::jsonb,
    NULL,
    'ich komme, du kommst, er/sie/es kommt',
    10
)

ON CONFLICT (word) DO NOTHING;
