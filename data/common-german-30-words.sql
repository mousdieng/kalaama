-- 30 Most Common German A1 Words
-- Essential vocabulary for beginners

INSERT INTO public.german_french_dictionary (
    word, article, gender, part_of_speech, difficulty_level,
    french_translation, french_definition, french_explanation,
    pronunciation_ipa, context_usage, examples, synonyms, antonyms, collocations,
    plural_form, conjugation_hint, frequency_rank
) VALUES

-- 1. ich (I)
('ich', NULL, NULL, 'pronoun', 'A1',
 'je',
 'Pronom personnel de la première personne du singulier.',
 'Toujours en minuscule sauf en début de phrase. Très important pour conjuguer les verbes.',
 '/ɪç/',
 'Sujet de la phrase, parler de soi',
 '[
    {"german": "Ich heiße Anna.", "french": "Je m''appelle Anna.", "level": "A1"},
    {"german": "Ich bin 20 Jahre alt.", "french": "J''ai 20 ans.", "level": "A1"},
    {"german": "Ich komme aus Paris.", "french": "Je viens de Paris.", "level": "A1"},
    {"german": "Ich lerne Deutsch.", "french": "J''apprends l''allemand.", "level": "A1"},
    {"german": "Ich mag Pizza.", "french": "J''aime la pizza.", "level": "A1"},
    {"german": "Ich gehe zur Schule.", "french": "Je vais à l''école.", "level": "A1"},
    {"german": "Ich verstehe nicht.", "french": "Je ne comprends pas.", "level": "A1"},
    {"german": "Ich möchte einen Kaffee.", "french": "Je voudrais un café.", "level": "A2"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 '[]'::jsonb,
 NULL, NULL, 11),

-- 2. du (you informal)
('du', NULL, NULL, 'pronoun', 'A1',
 'tu',
 'Pronom personnel de la deuxième personne du singulier (tutoiement).',
 'Utilisé entre amis, famille, enfants. Pour la politesse, utiliser "Sie".',
 '/duː/',
 'Tutoiement, s''adresser à quelqu''un de manière informelle',
 '[
    {"german": "Wie heißt du?", "french": "Comment tu t''appelles ?", "level": "A1"},
    {"german": "Woher kommst du?", "french": "D''où viens-tu ?", "level": "A1"},
    {"german": "Was machst du?", "french": "Que fais-tu ?", "level": "A1"},
    {"german": "Gehst du mit mir?", "french": "Tu viens avec moi ?", "level": "A1"},
    {"german": "Sprichst du Deutsch?", "french": "Parles-tu allemand ?", "level": "A1"},
    {"german": "Wie geht es dir?", "french": "Comment vas-tu ?", "level": "A1"},
    {"german": "Kannst du mir helfen?", "french": "Peux-tu m''aider ?", "level": "A2"},
    {"german": "Du bist sehr nett.", "french": "Tu es très gentil(le).", "level": "A1"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY['Sie'],
 '[]'::jsonb,
 NULL, NULL, 12),

-- 3. und (and)
('und', NULL, NULL, 'conjunction', 'A1',
 'et',
 'Conjonction de coordination pour lier des mots ou des phrases.',
 'Mot de liaison le plus basique. Très fréquent.',
 '/ʊnt/',
 'Relier des éléments, énumérer',
 '[
    {"german": "Ich und du.", "french": "Toi et moi.", "level": "A1"},
    {"german": "Kaffee und Kuchen.", "french": "Café et gâteau.", "level": "A1"},
    {"german": "Heute und morgen.", "french": "Aujourd''hui et demain.", "level": "A1"},
    {"german": "Ich esse und trinke.", "french": "Je mange et je bois.", "level": "A1"},
    {"german": "Er ist groß und stark.", "french": "Il est grand et fort.", "level": "A1"},
    {"german": "Wir lesen und schreiben.", "french": "Nous lisons et écrivons.", "level": "A1"},
    {"german": "Mein Vater und meine Mutter.", "french": "Mon père et ma mère.", "level": "A1"},
    {"german": "Sie singt und tanzt.", "french": "Elle chante et danse.", "level": "A1"}
 ]'::jsonb,
 ARRAY['sowie'],
 ARRAY['oder'],
 '[]'::jsonb,
 NULL, NULL, 13),

-- 4. nicht (not)
('nicht', NULL, NULL, 'adverb', 'A1',
 'ne...pas',
 'Négation principale en allemand.',
 'Position importante: généralement après le verbe conjugué. Attention à la position!',
 '/nɪçt/',
 'Négation, refus',
 '[
    {"german": "Ich verstehe nicht.", "french": "Je ne comprends pas.", "level": "A1"},
    {"german": "Das ist nicht gut.", "french": "Ce n''est pas bien.", "level": "A1"},
    {"german": "Ich komme nicht.", "french": "Je ne viens pas.", "level": "A1"},
    {"german": "Er spricht nicht Deutsch.", "french": "Il ne parle pas allemand.", "level": "A1"},
    {"german": "Das geht nicht.", "french": "Ce n''est pas possible.", "level": "A1"},
    {"german": "Ich bin nicht müde.", "french": "Je ne suis pas fatigué.", "level": "A1"},
    {"german": "Nicht jetzt!", "french": "Pas maintenant !", "level": "A1"},
    {"german": "Das weiß ich nicht.", "french": "Je ne sais pas.", "level": "A1"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 '[]'::jsonb,
 NULL, NULL, 14),

-- 5. machen (to make/do)
('machen', NULL, NULL, 'verb', 'A1',
 'faire',
 'Faire, fabriquer, réaliser quelque chose.',
 'Verbe régulier très polyvalent. Équivalent de "faire" en français.',
 '/ˈmaxən/',
 'Actions, activités, création',
 '[
    {"german": "Was machst du?", "french": "Que fais-tu ?", "level": "A1"},
    {"german": "Ich mache Hausaufgaben.", "french": "Je fais mes devoirs.", "level": "A1"},
    {"german": "Wir machen einen Ausflug.", "french": "Nous faisons une excursion.", "level": "A2"},
    {"german": "Das macht Spaß!", "french": "C''est amusant !", "level": "A1"},
    {"german": "Mach schnell!", "french": "Fais vite !", "level": "A1"},
    {"german": "Er macht einen Fehler.", "french": "Il fait une erreur.", "level": "A2"},
    {"german": "Was macht ihr heute?", "french": "Que faites-vous aujourd''hui ?", "level": "A1"},
    {"german": "Ich mache Sport.", "french": "Je fais du sport.", "level": "A1"}
 ]'::jsonb,
 ARRAY['tun'],
 ARRAY[]::TEXT[],
 '[
    {"phrase": "Hausaufgaben machen", "french": "faire ses devoirs"},
    {"phrase": "Sport machen", "french": "faire du sport"},
    {"phrase": "Spaß machen", "french": "être amusant"}
 ]'::jsonb,
 NULL, 'ich mache, du machst, er/sie/es macht', 15),

-- 6. können (can/to be able to)
('können', NULL, NULL, 'verb', 'A1',
 'pouvoir',
 'Verbe modal exprimant la capacité ou la possibilité.',
 'Verbe irrégulier modal très important. Change selon le sujet.',
 '/ˈkœnən/',
 'Capacité, possibilité, permission',
 '[
    {"german": "Ich kann schwimmen.", "french": "Je sais nager.", "level": "A1"},
    {"german": "Kannst du Deutsch?", "french": "Sais-tu l''allemand ?", "level": "A1"},
    {"german": "Er kann nicht kommen.", "french": "Il ne peut pas venir.", "level": "A1"},
    {"german": "Können Sie mir helfen?", "french": "Pouvez-vous m''aider ?", "level": "A1"},
    {"german": "Wir können das machen.", "french": "Nous pouvons faire ça.", "level": "A1"},
    {"german": "Kann ich gehen?", "french": "Puis-je partir ?", "level": "A1"},
    {"german": "Sie können gut tanzen.", "french": "Elles savent bien danser.", "level": "A2"},
    {"german": "Das kann sein.", "french": "C''est possible.", "level": "A2"}
 ]'::jsonb,
 ARRAY['vermögen'],
 ARRAY[]::TEXT[],
 '[]'::jsonb,
 NULL, 'ich kann, du kannst, er/sie/es kann', 16),

-- 7. ja (yes)
('ja', NULL, NULL, 'interjection', 'A1',
 'oui',
 'Affirmation, accord, confirmation.',
 'Réponse affirmative de base. Très utilisé.',
 '/jaː/',
 'Accord, confirmation',
 '[
    {"german": "Ja, ich komme.", "french": "Oui, je viens.", "level": "A1"},
    {"german": "Ja, das stimmt.", "french": "Oui, c''est vrai.", "level": "A1"},
    {"german": "Ja, bitte!", "french": "Oui, s''il vous plaît !", "level": "A1"},
    {"german": "Ja, natürlich!", "french": "Oui, bien sûr !", "level": "A1"},
    {"german": "Ja oder nein?", "french": "Oui ou non ?", "level": "A1"},
    {"german": "Ja, ich verstehe.", "french": "Oui, je comprends.", "level": "A1"},
    {"german": "Ja, gerne!", "french": "Oui, avec plaisir !", "level": "A1"},
    {"german": "Ja, danke.", "french": "Oui, merci.", "level": "A1"}
 ]'::jsonb,
 ARRAY['doch'],
 ARRAY['nein'],
 '[]'::jsonb,
 NULL, NULL, 17),

-- 8. nein (no)
('nein', NULL, NULL, 'interjection', 'A1',
 'non',
 'Négation, refus, désaccord.',
 'Réponse négative de base.',
 '/naɪn/',
 'Refus, négation',
 '[
    {"german": "Nein, danke.", "french": "Non, merci.", "level": "A1"},
    {"german": "Nein, ich kann nicht.", "french": "Non, je ne peux pas.", "level": "A1"},
    {"german": "Nein, das ist falsch.", "french": "Non, c''est faux.", "level": "A1"},
    {"german": "Nein, noch nicht.", "french": "Non, pas encore.", "level": "A1"},
    {"german": "Nein, nie!", "french": "Non, jamais !", "level": "A1"},
    {"german": "Nein, leider nicht.", "french": "Non, malheureusement pas.", "level": "A2"},
    {"german": "Nein, das stimmt nicht.", "french": "Non, ce n''est pas vrai.", "level": "A1"},
    {"german": "Nein, auf keinen Fall!", "french": "Non, en aucun cas !", "level": "B1"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY['ja'],
 '[]'::jsonb,
 NULL, NULL, 18),

-- 9. wir (we)
('wir', NULL, NULL, 'pronoun', 'A1',
 'nous',
 'Pronom personnel de la première personne du pluriel.',
 'Utilisé pour parler d''un groupe incluant le locuteur.',
 '/viːɐ̯/',
 'Parler d''un groupe incluant soi-même',
 '[
    {"german": "Wir sind Freunde.", "french": "Nous sommes amis.", "level": "A1"},
    {"german": "Wir gehen ins Kino.", "french": "Nous allons au cinéma.", "level": "A1"},
    {"german": "Wir lernen Deutsch.", "french": "Nous apprenons l''allemand.", "level": "A1"},
    {"german": "Wir kommen aus Frankreich.", "french": "Nous venons de France.", "level": "A1"},
    {"german": "Wir haben Zeit.", "french": "Nous avons le temps.", "level": "A1"},
    {"german": "Wir essen zusammen.", "french": "Nous mangeons ensemble.", "level": "A1"},
    {"german": "Wir können das schaffen.", "french": "Nous pouvons y arriver.", "level": "A2"},
    {"german": "Wir sehen uns morgen.", "french": "On se voit demain.", "level": "A1"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 '[]'::jsonb,
 NULL, NULL, 19),

-- 10. sie/Sie (she/they/you formal)
('sie', NULL, NULL, 'pronoun', 'A1',
 'elle/ils/elles/vous',
 'Pronom: elle (singulier), ils/elles (pluriel), ou vous (forme de politesse avec majuscule).',
 'Attention: "sie" (minuscule) = elle/ils/elles, "Sie" (majuscule) = vous (formel).',
 '/ziː/',
 'Parler d''une femme, d''un groupe, ou vouvoiement',
 '[
    {"german": "Sie ist meine Schwester.", "french": "Elle est ma sœur.", "level": "A1"},
    {"german": "Sie sind Studenten.", "french": "Ils sont étudiants.", "level": "A1"},
    {"german": "Wie heißen Sie?", "french": "Comment vous appelez-vous ?", "level": "A1"},
    {"german": "Sie kommt aus Deutschland.", "french": "Elle vient d''Allemagne.", "level": "A1"},
    {"german": "Sie haben Hunger.", "french": "Ils ont faim.", "level": "A1"},
    {"german": "Wo wohnen Sie?", "french": "Où habitez-vous ?", "level": "A1"},
    {"german": "Sie arbeitet als Lehrerin.", "french": "Elle travaille comme professeure.", "level": "A2"},
    {"german": "Sie möchten bestellen?", "french": "Vous voulez commander ?", "level": "A2"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 '[]'::jsonb,
 NULL, NULL, 20),

-- 11. er (he/it)
('er', NULL, NULL, 'pronoun', 'A1',
 'il',
 'Pronom personnel masculin de la troisième personne du singulier.',
 'Utilisé pour les personnes masculines et les noms masculins.',
 '/eːɐ̯/',
 'Parler d''une personne masculine ou chose masculine',
 '[
    {"german": "Er ist mein Bruder.", "french": "C''est mon frère.", "level": "A1"},
    {"german": "Er kommt später.", "french": "Il vient plus tard.", "level": "A1"},
    {"german": "Er spricht gut Deutsch.", "french": "Il parle bien allemand.", "level": "A1"},
    {"german": "Wo ist er?", "french": "Où est-il ?", "level": "A1"},
    {"german": "Er arbeitet viel.", "french": "Il travaille beaucoup.", "level": "A1"},
    {"german": "Er hat einen Hund.", "french": "Il a un chien.", "level": "A1"},
    {"german": "Er ist sehr nett.", "french": "Il est très gentil.", "level": "A1"},
    {"german": "Er kann gut kochen.", "french": "Il sait bien cuisiner.", "level": "A2"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 '[]'::jsonb,
 NULL, NULL, 21),

-- 12. es (it)
('es', NULL, NULL, 'pronoun', 'A1',
 'il/ce',
 'Pronom neutre de la troisième personne du singulier.',
 'Utilisé pour les noms neutres et dans les expressions impersonnelles.',
 '/ɛs/',
 'Choses neutres, expressions impersonnelles',
 '[
    {"german": "Es ist kalt.", "french": "Il fait froid.", "level": "A1"},
    {"german": "Es regnet.", "french": "Il pleut.", "level": "A1"},
    {"german": "Es geht mir gut.", "french": "Je vais bien.", "level": "A1"},
    {"german": "Wie spät ist es?", "french": "Quelle heure est-il ?", "level": "A1"},
    {"german": "Es tut mir leid.", "french": "Je suis désolé.", "level": "A1"},
    {"german": "Es gibt viele Menschen.", "french": "Il y a beaucoup de gens.", "level": "A2"},
    {"german": "Es schmeckt gut.", "french": "C''est bon.", "level": "A1"},
    {"german": "Es ist schon spät.", "french": "Il est déjà tard.", "level": "A1"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 '[]'::jsonb,
 NULL, NULL, 22),

-- 13. der/die/das (the)
('der', 'der', 'm', 'article', 'A1',
 'le',
 'Article défini masculin.',
 'Change selon le genre, le nombre et le cas. "der" = masculin nominatif.',
 '/deːɐ̯/',
 'Article défini pour les noms masculins',
 '[
    {"german": "Der Mann ist groß.", "french": "L''homme est grand.", "level": "A1"},
    {"german": "Der Tisch ist braun.", "french": "La table est marron.", "level": "A1"},
    {"german": "Der Hund bellt.", "french": "Le chien aboie.", "level": "A1"},
    {"german": "Der Apfel ist rot.", "french": "La pomme est rouge.", "level": "A1"},
    {"german": "Der Lehrer kommt.", "french": "Le professeur arrive.", "level": "A1"},
    {"german": "Der Zug fährt ab.", "french": "Le train part.", "level": "A2"},
    {"german": "Der Film war gut.", "french": "Le film était bien.", "level": "A2"},
    {"german": "Der Winter ist kalt.", "french": "L''hiver est froid.", "level": "A1"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 '[]'::jsonb,
 NULL, NULL, 23),

-- 14. in (in)
('in', NULL, NULL, 'preposition', 'A1',
 'dans/en/à',
 'Préposition de lieu ou de temps.',
 'Gouverne le datif (où?) ou l''accusatif (où vers?).',
 '/ɪn/',
 'Localisation, direction',
 '[
    {"german": "Ich bin in Berlin.", "french": "Je suis à Berlin.", "level": "A1"},
    {"german": "Wir gehen in die Schule.", "french": "Nous allons à l''école.", "level": "A1"},
    {"german": "Er ist in der Küche.", "french": "Il est dans la cuisine.", "level": "A1"},
    {"german": "In fünf Minuten.", "french": "Dans cinq minutes.", "level": "A1"},
    {"german": "Im Sommer.", "french": "En été.", "level": "A1"},
    {"german": "In Deutschland.", "french": "En Allemagne.", "level": "A1"},
    {"german": "Ich wohne in Paris.", "french": "J''habite à Paris.", "level": "A1"},
    {"german": "In der Nacht.", "french": "Pendant la nuit.", "level": "A2"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY['aus'],
 '[]'::jsonb,
 NULL, NULL, 24),

-- 15. zu (to/too)
('zu', NULL, NULL, 'preposition', 'A1',
 'à/trop/vers',
 'Préposition ou adverbe.',
 'Très polyvalent: direction, but, "trop" devant adjectif.',
 '/tsuː/',
 'Direction, destination, intensité',
 '[
    {"german": "Ich gehe zu Fuß.", "french": "Je vais à pied.", "level": "A1"},
    {"german": "Zu Hause.", "french": "À la maison.", "level": "A1"},
    {"german": "Ich fahre zum Bahnhof.", "french": "Je vais à la gare.", "level": "A1"},
    {"german": "Das ist zu teuer.", "french": "C''est trop cher.", "level": "A1"},
    {"german": "Willkommen zu Hause!", "french": "Bienvenue à la maison !", "level": "A1"},
    {"german": "Zu spät!", "french": "Trop tard !", "level": "A1"},
    {"german": "Ich gehe zur Arbeit.", "french": "Je vais au travail.", "level": "A1"},
    {"german": "Zum Glück!", "french": "Heureusement !", "level": "A2"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY['von'],
 '[
    {"phrase": "zu Hause", "french": "à la maison"},
    {"phrase": "zu Fuß", "french": "à pied"},
    {"phrase": "zum Glück", "french": "heureusement"}
 ]'::jsonb,
 NULL, NULL, 25),

-- 16. mit (with)
('mit', NULL, NULL, 'preposition', 'A1',
 'avec',
 'Préposition exprimant l''accompagnement.',
 'Toujours suivi du datif.',
 '/mɪt/',
 'Accompagnement, moyen',
 '[
    {"german": "Ich komme mit dir.", "french": "Je viens avec toi.", "level": "A1"},
    {"german": "Mit dem Auto.", "french": "En voiture.", "level": "A1"},
    {"german": "Mit Milch und Zucker.", "french": "Avec du lait et du sucre.", "level": "A1"},
    {"german": "Wir fahren mit dem Zug.", "french": "Nous voyageons en train.", "level": "A1"},
    {"german": "Mit Freunden.", "french": "Avec des amis.", "level": "A1"},
    {"german": "Mit 18 Jahren.", "french": "À 18 ans.", "level": "A2"},
    {"german": "Kommst du mit?", "french": "Tu viens avec moi ?", "level": "A1"},
    {"german": "Mit Vergnügen!", "french": "Avec plaisir !", "level": "A2"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY['ohne'],
 '[
    {"phrase": "mit dem Auto", "french": "en voiture"},
    {"phrase": "mit Freunden", "french": "avec des amis"}
 ]'::jsonb,
 NULL, NULL, 26),

-- 17. für (for)
('für', NULL, NULL, 'preposition', 'A1',
 'pour',
 'Préposition indiquant la destination ou le bénéficiaire.',
 'Toujours suivi de l''accusatif.',
 '/fyːɐ̯/',
 'But, destination, durée',
 '[
    {"german": "Das ist für dich.", "french": "C''est pour toi.", "level": "A1"},
    {"german": "Für eine Woche.", "french": "Pour une semaine.", "level": "A1"},
    {"german": "Ich arbeite für eine Firma.", "french": "Je travaille pour une entreprise.", "level": "A2"},
    {"german": "Danke für die Hilfe.", "french": "Merci pour l''aide.", "level": "A1"},
    {"german": "Für mich, bitte.", "french": "Pour moi, s''il vous plaît.", "level": "A1"},
    {"german": "Was hast du für mich?", "french": "Qu''as-tu pour moi ?", "level": "A1"},
    {"german": "Für immer.", "french": "Pour toujours.", "level": "A2"},
    {"german": "Ein Geschenk für dich.", "french": "Un cadeau pour toi.", "level": "A1"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY['gegen'],
 '[]'::jsonb,
 NULL, NULL, 27),

-- 18. auf (on/at)
('auf', NULL, NULL, 'preposition', 'A1',
 'sur',
 'Préposition de lieu ou de direction.',
 'Gouverne le datif (où?) ou l''accusatif (où vers?).',
 '/aʊf/',
 'Position sur une surface, direction vers le haut',
 '[
    {"german": "Auf dem Tisch.", "french": "Sur la table.", "level": "A1"},
    {"german": "Ich lege es auf den Tisch.", "french": "Je le pose sur la table.", "level": "A1"},
    {"german": "Auf Wiedersehen!", "french": "Au revoir !", "level": "A1"},
    {"german": "Wir gehen auf den Berg.", "french": "Nous montons sur la montagne.", "level": "A2"},
    {"german": "Auf Deutsch.", "french": "En allemand.", "level": "A1"},
    {"german": "Ich freue mich auf morgen.", "french": "J''ai hâte d''être à demain.", "level": "B1"},
    {"german": "Auf der Straße.", "french": "Dans la rue.", "level": "A1"},
    {"german": "Auf jeden Fall!", "french": "En tout cas !", "level": "A2"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY['unter'],
 '[
    {"phrase": "auf Wiedersehen", "french": "au revoir"},
    {"phrase": "auf Deutsch", "french": "en allemand"}
 ]'::jsonb,
 NULL, NULL, 28),

-- 19. von (from/of)
('von', NULL, NULL, 'preposition', 'A1',
 'de',
 'Préposition indiquant l''origine ou la provenance.',
 'Toujours suivi du datif. Équivalent de "de" en français.',
 '/fɔn/',
 'Origine, provenance, possession',
 '[
    {"german": "Ich komme von der Arbeit.", "french": "Je viens du travail.", "level": "A1"},
    {"german": "Ein Freund von mir.", "french": "Un ami à moi.", "level": "A1"},
    {"german": "Von 9 bis 17 Uhr.", "french": "De 9h à 17h.", "level": "A1"},
    {"german": "Das Buch von Goethe.", "french": "Le livre de Goethe.", "level": "A2"},
    {"german": "Von hier nach dort.", "french": "D''ici à là.", "level": "A1"},
    {"german": "Ich habe von ihm gehört.", "french": "J''ai entendu parler de lui.", "level": "B1"},
    {"german": "Von mir aus.", "french": "Pour moi, ça va.", "level": "B1"},
    {"german": "Ein Brief von meiner Mutter.", "french": "Une lettre de ma mère.", "level": "A2"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY['zu'],
 '[
    {"phrase": "von...bis", "french": "de...à"},
    {"phrase": "von mir aus", "french": "pour moi, ça va"}
 ]'::jsonb,
 NULL, NULL, 29),

-- 20. an (at/on/to)
('an', NULL, NULL, 'preposition', 'A1',
 'à/sur',
 'Préposition de lieu (près de, contre).',
 'Gouverne le datif (où?) ou l''accusatif (où vers?).',
 '/an/',
 'Proximité, contact vertical',
 '[
    {"german": "An der Wand.", "french": "Au mur.", "level": "A1"},
    {"german": "Ich hänge es an die Wand.", "french": "Je l''accroche au mur.", "level": "A2"},
    {"german": "Am Montag.", "french": "Lundi.", "level": "A1"},
    {"german": "An der Tür.", "french": "À la porte.", "level": "A1"},
    {"german": "Denk an mich!", "french": "Pense à moi !", "level": "A2"},
    {"german": "Am Meer.", "french": "Au bord de la mer.", "level": "A1"},
    {"german": "An meinem Geburtstag.", "french": "Le jour de mon anniversaire.", "level": "A2"},
    {"german": "Ich arbeite an einem Projekt.", "french": "Je travaille sur un projet.", "level": "B1"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 '[
    {"phrase": "am Montag", "french": "lundi"},
    {"phrase": "am Meer", "french": "au bord de la mer"}
 ]'::jsonb,
 NULL, NULL, 30),

-- 21. wie (how/like)
('wie', NULL, NULL, 'adverb', 'A1',
 'comment/comme',
 'Adverbe interrogatif ou comparatif.',
 'Pour poser des questions ou faire des comparaisons.',
 '/viː/',
 'Questions, comparaisons',
 '[
    {"german": "Wie heißt du?", "french": "Comment t''appelles-tu ?", "level": "A1"},
    {"german": "Wie geht es dir?", "french": "Comment vas-tu ?", "level": "A1"},
    {"german": "Wie alt bist du?", "french": "Quel âge as-tu ?", "level": "A1"},
    {"german": "Wie spät ist es?", "french": "Quelle heure est-il ?", "level": "A1"},
    {"german": "So groß wie du.", "french": "Aussi grand que toi.", "level": "A2"},
    {"german": "Wie bitte?", "french": "Pardon ?", "level": "A1"},
    {"german": "Wie schön!", "french": "Comme c''est beau !", "level": "A1"},
    {"german": "Wie viel kostet das?", "french": "Combien ça coûte ?", "level": "A1"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 '[
    {"phrase": "wie geht es dir", "french": "comment vas-tu"},
    {"phrase": "wie viel", "french": "combien"},
    {"phrase": "wie bitte", "french": "pardon"}
 ]'::jsonb,
 NULL, NULL, 31),

-- 22. was (what)
('was', NULL, NULL, 'pronoun', 'A1',
 'quoi/que',
 'Pronom interrogatif neutre.',
 'Pour poser des questions sur les choses.',
 '/vas/',
 'Questions sur les choses, les objets',
 '[
    {"german": "Was ist das?", "french": "Qu''est-ce que c''est ?", "level": "A1"},
    {"german": "Was machst du?", "french": "Que fais-tu ?", "level": "A1"},
    {"german": "Was möchtest du?", "french": "Que veux-tu ?", "level": "A1"},
    {"german": "Was kostet das?", "french": "Combien ça coûte ?", "level": "A1"},
    {"german": "Was gibt es?", "french": "Qu''y a-t-il ?", "level": "A1"},
    {"german": "Was hast du gesagt?", "french": "Qu''as-tu dit ?", "level": "A1"},
    {"german": "Was für ein Auto?", "french": "Quel genre de voiture ?", "level": "A2"},
    {"german": "Was noch?", "french": "Quoi d''autre ?", "level": "A1"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 '[
    {"phrase": "was ist das", "french": "qu''est-ce que c''est"},
    {"phrase": "was für", "french": "quel genre de"}
 ]'::jsonb,
 NULL, NULL, 32),

-- 23. wo (where)
('wo', NULL, NULL, 'adverb', 'A1',
 'où',
 'Adverbe interrogatif de lieu.',
 'Pour demander un emplacement (pas de mouvement).',
 '/voː/',
 'Questions de localisation',
 '[
    {"german": "Wo bist du?", "french": "Où es-tu ?", "level": "A1"},
    {"german": "Wo wohnst du?", "french": "Où habites-tu ?", "level": "A1"},
    {"german": "Wo ist die Toilette?", "french": "Où sont les toilettes ?", "level": "A1"},
    {"german": "Wo kommst du her?", "french": "D''où viens-tu ?", "level": "A1"},
    {"german": "Wo arbeiten Sie?", "french": "Où travaillez-vous ?", "level": "A1"},
    {"german": "Wo warst du?", "french": "Où étais-tu ?", "level": "A1"},
    {"german": "Wo kann ich das kaufen?", "french": "Où puis-je acheter ça ?", "level": "A2"},
    {"german": "Wo sind meine Schlüssel?", "french": "Où sont mes clés ?", "level": "A1"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 '[
    {"phrase": "wo bist du", "french": "où es-tu"},
    {"phrase": "wo ist", "french": "où est"}
 ]'::jsonb,
 NULL, NULL, 33),

-- 24. wer (who)
('wer', NULL, NULL, 'pronoun', 'A1',
 'qui',
 'Pronom interrogatif pour les personnes.',
 'Nominatif de "qui". Déclinaisons: wessen (génitif), wem (datif), wen (accusatif).',
 '/veːɐ̯/',
 'Questions sur les personnes',
 '[
    {"german": "Wer bist du?", "french": "Qui es-tu ?", "level": "A1"},
    {"german": "Wer ist das?", "french": "Qui est-ce ?", "level": "A1"},
    {"german": "Wer kommt mit?", "french": "Qui vient avec ?", "level": "A1"},
    {"german": "Wer hat das gesagt?", "french": "Qui a dit ça ?", "level": "A1"},
    {"german": "Wer ist dein Lehrer?", "french": "Qui est ton professeur ?", "level": "A1"},
    {"german": "Wer kann mir helfen?", "french": "Qui peut m''aider ?", "level": "A1"},
    {"german": "Wer war das?", "french": "Qui était-ce ?", "level": "A1"},
    {"german": "Wer weiß das?", "french": "Qui sait ça ?", "level": "A1"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY[]::TEXT[],
 '[]'::jsonb,
 NULL, NULL, 34),

-- 25. wenn (if/when)
('wenn', NULL, NULL, 'conjunction', 'A1',
 'si/quand',
 'Conjonction de subordination conditionnelle ou temporelle.',
 'Pour exprimer une condition ou une répétition dans le temps.',
 '/vɛn/',
 'Condition, temps (répétition)',
 '[
    {"german": "Wenn ich Zeit habe.", "french": "Si j''ai le temps.", "level": "A1"},
    {"german": "Wenn du kommst.", "french": "Quand tu viens.", "level": "A1"},
    {"german": "Wenn es regnet.", "french": "S''il pleut.", "level": "A1"},
    {"german": "Ich rufe dich an, wenn ich da bin.", "french": "Je t''appelle quand j''arrive.", "level": "A2"},
    {"german": "Wenn ich Geld hätte.", "french": "Si j''avais de l''argent.", "level": "B1"},
    {"german": "Wenn du willst.", "french": "Si tu veux.", "level": "A1"},
    {"german": "Immer wenn ich lerne.", "french": "Chaque fois que j''étudie.", "level": "A2"},
    {"german": "Wenn möglich.", "french": "Si possible.", "level": "A2"}
 ]'::jsonb,
 ARRAY['falls'],
 ARRAY[]::TEXT[],
 '[]'::jsonb,
 NULL, NULL, 35),

-- 26. weil (because)
('weil', NULL, NULL, 'conjunction', 'A1',
 'parce que',
 'Conjonction de subordination causale.',
 'Verbe conjugué va à la fin de la proposition subordonnée.',
 '/vaɪl/',
 'Exprimer une cause, une raison',
 '[
    {"german": "Ich bleibe zu Hause, weil ich krank bin.", "french": "Je reste à la maison parce que je suis malade.", "level": "A1"},
    {"german": "Weil es kalt ist.", "french": "Parce qu''il fait froid.", "level": "A1"},
    {"german": "Er lernt, weil er eine Prüfung hat.", "french": "Il étudie parce qu''il a un examen.", "level": "A1"},
    {"german": "Weil ich müde bin.", "french": "Parce que je suis fatigué.", "level": "A1"},
    {"german": "Sie kommt nicht, weil sie keine Zeit hat.", "french": "Elle ne vient pas parce qu''elle n''a pas le temps.", "level": "A2"},
    {"german": "Weil ich dich mag.", "french": "Parce que je t''aime bien.", "level": "A1"},
    {"german": "Weil das wichtig ist.", "french": "Parce que c''est important.", "level": "A1"},
    {"german": "Ich frage, weil ich es wissen will.", "french": "Je demande parce que je veux le savoir.", "level": "A2"}
 ]'::jsonb,
 ARRAY['da'],
 ARRAY[]::TEXT[],
 '[]'::jsonb,
 NULL, NULL, 36),

-- 27. oder (or)
('oder', NULL, NULL, 'conjunction', 'A1',
 'ou',
 'Conjonction de coordination pour exprimer une alternative.',
 'Choix entre deux options.',
 '/ˈoːdɐ/',
 'Alternative, choix',
 '[
    {"german": "Kaffee oder Tee?", "french": "Café ou thé ?", "level": "A1"},
    {"german": "Ja oder nein?", "french": "Oui ou non ?", "level": "A1"},
    {"german": "Heute oder morgen?", "french": "Aujourd''hui ou demain ?", "level": "A1"},
    {"german": "Kommst du oder nicht?", "french": "Tu viens ou pas ?", "level": "A1"},
    {"german": "Du oder ich.", "french": "Toi ou moi.", "level": "A1"},
    {"german": "Links oder rechts?", "french": "À gauche ou à droite ?", "level": "A1"},
    {"german": "Mit oder ohne Zucker?", "french": "Avec ou sans sucre ?", "level": "A1"},
    {"german": "Jetzt oder nie!", "french": "Maintenant ou jamais !", "level": "A2"}
 ]'::jsonb,
 ARRAY[]::TEXT[],
 ARRAY['und'],
 '[]'::jsonb,
 NULL, NULL, 37),

-- 28. dann (then)
('dann', NULL, NULL, 'adverb', 'A1',
 'alors/puis',
 'Adverbe temporel ou conséquentiel.',
 'Indique une séquence temporelle ou logique.',
 '/dan/',
 'Séquence, conséquence',
 '[
    {"german": "Zuerst das, dann das.", "french": "D''abord ça, puis ça.", "level": "A1"},
    {"german": "Bis dann!", "french": "À plus tard !", "level": "A1"},
    {"german": "Und dann?", "french": "Et puis ?", "level": "A1"},
    {"german": "Wenn du Zeit hast, dann komm.", "french": "Si tu as le temps, alors viens.", "level": "A2"},
    {"german": "Dann gehe ich.", "french": "Alors je pars.", "level": "A1"},
    {"german": "Erst essen, dann spielen.", "french": "D''abord manger, puis jouer.", "level": "A1"},
    {"german": "Dann ist es zu spät.", "french": "Alors ce sera trop tard.", "level": "A2"},
    {"german": "Okay, dann machen wir das.", "french": "OK, alors on fait ça.", "level": "A1"}
 ]'::jsonb,
 ARRAY['anschließend', 'danach'],
 ARRAY[]::TEXT[],
 '[
    {"phrase": "bis dann", "french": "à plus tard"},
    {"phrase": "und dann", "french": "et puis"}
 ]'::jsonb,
 NULL, NULL, 38),

-- 29. jetzt (now)
('jetzt', NULL, NULL, 'adverb', 'A1',
 'maintenant',
 'Adverbe de temps pour le moment présent.',
 'Indique l''instant présent.',
 '/jɛtst/',
 'Moment présent, immédiat',
 '[
    {"german": "Jetzt oder nie!", "french": "Maintenant ou jamais !", "level": "A1"},
    {"german": "Was machst du jetzt?", "french": "Que fais-tu maintenant ?", "level": "A1"},
    {"german": "Ich gehe jetzt.", "french": "Je pars maintenant.", "level": "A1"},
    {"german": "Bis jetzt.", "french": "Jusqu''à maintenant.", "level": "A1"},
    {"german": "Nicht jetzt!", "french": "Pas maintenant !", "level": "A1"},
    {"german": "Jetzt verstehe ich.", "french": "Maintenant je comprends.", "level": "A1"},
    {"german": "Von jetzt an.", "french": "À partir de maintenant.", "level": "A2"},
    {"german": "Gerade jetzt.", "french": "Juste maintenant.", "level": "A1"}
 ]'::jsonb,
 ARRAY['nun'],
 ARRAY['später'],
 '[
    {"phrase": "jetzt oder nie", "french": "maintenant ou jamais"},
    {"phrase": "bis jetzt", "french": "jusqu''à maintenant"}
 ]'::jsonb,
 NULL, NULL, 39),

-- 30. hier (here)
('hier', NULL, NULL, 'adverb', 'A1',
 'ici',
 'Adverbe de lieu pour indiquer la proximité.',
 'Indique un endroit proche du locuteur.',
 '/hiːɐ̯/',
 'Proximité spatiale',
 '[
    {"german": "Ich bin hier.", "french": "Je suis ici.", "level": "A1"},
    {"german": "Komm hier!", "french": "Viens ici !", "level": "A1"},
    {"german": "Hier ist es schön.", "french": "C''est beau ici.", "level": "A1"},
    {"german": "Was machst du hier?", "french": "Que fais-tu ici ?", "level": "A1"},
    {"german": "Hier entlang, bitte.", "french": "Par ici, s''il vous plaît.", "level": "A1"},
    {"german": "Hier und da.", "french": "Ici et là.", "level": "A2"},
    {"german": "Von hier aus.", "french": "D''ici.", "level": "A2"},
    {"german": "Hier bleiben!", "french": "Reste ici !", "level": "A1"}
 ]'::jsonb,
 ARRAY['da'],
 ARRAY['dort'],
 '[
    {"phrase": "hier und da", "french": "ici et là"},
    {"phrase": "hier entlang", "french": "par ici"}
 ]'::jsonb,
 NULL, NULL, 40)

ON CONFLICT (word) DO NOTHING;
