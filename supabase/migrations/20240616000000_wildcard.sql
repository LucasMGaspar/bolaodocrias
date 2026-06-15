-- Dobro ou Nada: 1 wildcard por dia por utilizador
-- Acertar placar exato c/ wildcard → +6 pts
-- Acertar vencedor/empate c/ wildcard → +2 pts
-- Errar c/ wildcard → -1 pt

ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS wildcard BOOLEAN DEFAULT FALSE;

-- Recriar função de pontuação com suporte a wildcard
CREATE OR REPLACE FUNCTION calculate_match_points()
RETURNS TRIGGER AS $$
DECLARE
  uid UUID;
BEGIN
  IF NEW.status = 'FT' AND OLD.status != 'FT' THEN

    -- Placar exato: +3 (ou +6 com wildcard)
    UPDATE public.league_members lm
    SET total_score = total_score + CASE WHEN p.wildcard THEN 6 ELSE 3 END
    FROM public.predictions p, public.leagues l
    WHERE p.match_id = NEW.id
      AND p.user_id = lm.user_id
      AND l.id = lm.league_id
      AND p.guess_a = NEW.score_a
      AND p.guess_b = NEW.score_b
      AND (
        l.settings->'leagues' IS NULL
        OR jsonb_array_length(l.settings->'leagues') = 0
        OR l.settings->'leagues' ? NEW.league_name
      );

    -- Vencedor certo (não exato, não empate): +1 (ou +2 com wildcard)
    UPDATE public.league_members lm
    SET total_score = total_score + CASE WHEN p.wildcard THEN 2 ELSE 1 END
    FROM public.predictions p, public.leagues l
    WHERE p.match_id = NEW.id
      AND p.user_id = lm.user_id
      AND l.id = lm.league_id
      AND SIGN(p.guess_a - p.guess_b) = SIGN(NEW.score_a - NEW.score_b)
      AND NEW.score_a != NEW.score_b
      AND NOT (p.guess_a = NEW.score_a AND p.guess_b = NEW.score_b)
      AND (
        l.settings->'leagues' IS NULL
        OR jsonb_array_length(l.settings->'leagues') = 0
        OR l.settings->'leagues' ? NEW.league_name
      );

    -- Empate certo (placar errado): +1 (ou +2 com wildcard)
    UPDATE public.league_members lm
    SET total_score = total_score + CASE WHEN p.wildcard THEN 2 ELSE 1 END
    FROM public.predictions p, public.leagues l
    WHERE p.match_id = NEW.id
      AND p.user_id = lm.user_id
      AND l.id = lm.league_id
      AND NEW.score_a = NEW.score_b
      AND p.guess_a = p.guess_b
      AND NOT (p.guess_a = NEW.score_a AND p.guess_b = NEW.score_b)
      AND (
        l.settings->'leagues' IS NULL
        OR jsonb_array_length(l.settings->'leagues') = 0
        OR l.settings->'leagues' ? NEW.league_name
      );

    -- Wildcard errado: -1 pt (penalidade)
    UPDATE public.league_members lm
    SET total_score = total_score - 1
    FROM public.predictions p, public.leagues l
    WHERE p.match_id = NEW.id
      AND p.user_id = lm.user_id
      AND l.id = lm.league_id
      AND p.wildcard = TRUE
      AND NOT (p.guess_a = NEW.score_a AND p.guess_b = NEW.score_b)
      AND NOT (
        SIGN(p.guess_a - p.guess_b) = SIGN(NEW.score_a - NEW.score_b)
        AND NEW.score_a != NEW.score_b
      )
      AND NOT (NEW.score_a = NEW.score_b AND p.guess_a = p.guess_b)
      AND (
        l.settings->'leagues' IS NULL
        OR jsonb_array_length(l.settings->'leagues') = 0
        OR l.settings->'leagues' ? NEW.league_name
      );

    -- Verificar badges para cada palpiteiro desse jogo
    FOR uid IN SELECT DISTINCT user_id FROM public.predictions WHERE match_id = NEW.id LOOP
      BEGIN
        PERFORM check_and_award_badges(uid);
      EXCEPTION WHEN undefined_function THEN
        NULL;
      END;
    END LOOP;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
